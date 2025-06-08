// hooks/useGPXProcessor.ts

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useMutation } from "convex/react";
// For professional GeoJSON typing, install with: npm install -D @types/geojson
import type { Feature, LineString, MultiPoint } from "geojson";
import { useCallback, useEffect, useRef, useState } from "react";

// ==================================
// TYPE DEFINITIONS ("The Contract")
// ==================================
// This section defines the structure of the data we expect back from the
// gpxProcessor.js worker. It's crucial to keep this in sync with the
// object returned by the worker's `processPoints` function.

interface TrackPoint {
  latitude: number;
  longitude: number;
  elevation?: number;
  timestamp?: number;
}

interface ActivityStats {
  distance: number;
  duration: number;
  elevationGain: number;
  elevationLoss: number;
  maxElevation: number;
  minElevation: number;
  avgSpeed: number;
  maxSpeed: number;
  startTime?: number;
  endTime?: number;
  boundingBox: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  center: {
    lat: number;
    lng: number;
  };
}

/**
 * The shape of the entire data object returned by the worker on success.
 * This must match the `saveProcessedActivity` mutation's `processedData` argument.
 */
interface ParsedActivityData {
  name: string;
  points: TrackPoint[];
  stats: ActivityStats;
  geoJson: Feature<LineString | MultiPoint>;
}

// --- Status types for the UI ---

export type ProcessingStatus =
  | "pending"
  | "uploading"
  | "processing"
  | "saving"
  | "completed"
  | "failed";

export interface FileProcessingState {
  fileId: string; // A unique ID for the client-side process
  fileName: string;
  status: "pending" | "creating" | "processing" | "saving" | "completed" | "failed";
  error?: string;
  activityId?: Id<"activities">; // The ID of the document in Convex
}

// ==================================
// THE HOOK
// ==================================

/**
 * A custom hook to manage file processing using a web worker and saving to Convex.
 * Implements a "create-then-update" pattern for a responsive UI.
 * @param journeyId - The ID of the journey to associate activities with.
 */
export function useGPXProcessor(journeyId: Id<"journeys">) {
  const [processingStates, setProcessingStates] = useState<Map<string, FileProcessingState>>(
    new Map()
  );
  const workerRef = useRef<Worker | null>(null);

  // --- REFACTORED MUTATIONS ---
  const createPlaceholder = useMutation(api.activities.mutations.createPlaceholder);
  const saveProcessedActivity = useMutation(api.activities.mutations.saveProcessedActivity);
  const failProcessing = useMutation(api.activities.mutations.failProcessing);
  const generateUploadUrl = useMutation(api.storage.mutations.generateUploadUrl);

  // Worker setup (no changes needed, it's correct)
  useEffect(() => {
    const worker = new Worker(new URL("../public/workers/gpxProcessor.js", import.meta.url));
    workerRef.current = worker;
    // The onmessage handler will be managed by the processing function's promise
    return () => worker.terminate();
  }, []);

  const updateState = useCallback((fileId: string, updates: Partial<FileProcessingState>) => {
    setProcessingStates((prev) => {
      const newMap = new Map(prev);
      const currentState = newMap.get(fileId);
      if (currentState) {
        newMap.set(fileId, { ...currentState, ...updates });
      }
      return newMap;
    });
  }, []);

  // --- CORE PROCESSING LOGIC (REWRITTEN) ---

  const processSingleFile = async (file: File, fileId: string) => {
    let activityId: Id<"activities"> | undefined;

    try {
      // ===== STEP 1: CREATE PLACEHOLDER IN CONVEX =====
      updateState(fileId, { status: "creating" });
      activityId = await createPlaceholder({
        journeyId,
        originalFileName: file.name,
        activityType: "hiking", // TODO: Make this selectable
      });
      updateState(fileId, { status: "processing", activityId });

      // ===== STEP 2: UPLOAD & PROCESS IN PARALLEL =====
      const uploadPromise = (async () => {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!result.ok) throw new Error(`Upload failed with status: ${result.status}`);
        const { storageId } = await result.json();
        return storageId as Id<"_storage">;
      })();

      const workerPromise = new Promise((resolve, reject) => {
        if (!workerRef.current) return reject(new Error("Worker not initialized."));
        const timeout = setTimeout(() => reject(new Error("Processing timed out.")), 30000);

        const handleMessage = (event: MessageEvent) => {
          if (event.data.fileId === fileId) {
            clearTimeout(timeout);
            workerRef.current?.removeEventListener("message", handleMessage);
            if (event.data.success) {
              resolve(event.data.data);
            } else {
              reject(new Error(event.data.error));
            }
          }
        };
        workerRef.current.addEventListener("message", handleMessage);
        workerRef.current.postMessage({ file, fileId });
      });

      const [gpxStorageId, processedData] = await Promise.all([uploadPromise, workerPromise]);

      // ===== STEP 3: SAVE FINAL DATA TO CONVEX =====
      updateState(fileId, { status: "saving" });
      await saveProcessedActivity({
        activityId,
        gpxStorageId,
        // The structure of `processedData` must match the mutation args
        processedData: processedData as ParsedActivityData,
      });

      updateState(fileId, { status: "completed" });
    } catch (e) {
      console.error(`Failed to process ${file.name}:`, e);
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
      updateState(fileId, { status: "failed", error: errorMessage });

      // If we managed to create a placeholder, mark it as failed in the DB
      if (activityId) {
        await failProcessing({ activityId, error: errorMessage });
      }
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const processFiles = useCallback(
    async (files: FileList) => {
      const fileArray = Array.from(files);
      const initialStates = new Map<string, FileProcessingState>();
      const filesToProcess: { file: File; fileId: string }[] = [];

      for (const file of fileArray) {
        // Create a unique ID for this specific upload+process job
        const fileId = `${file.name}-${Date.now()}-${Math.random()}`;
        initialStates.set(fileId, { fileId, fileName: file.name, status: "pending" });
        filesToProcess.push({ file, fileId });
      }

      setProcessingStates(
        (prev) => new Map([...Array.from(prev.entries()), ...Array.from(initialStates.entries())])
      );

      // Don't block the UI. Process each file independently.
      for (const { file, fileId } of filesToProcess) {
        processSingleFile(file, fileId);
      }
    },
    [journeyId, createPlaceholder, saveProcessedActivity, failProcessing, generateUploadUrl]
  );

  // --- UTILITY FUNCTIONS ---

  const removeFile = useCallback((fileId: string) => {
    setProcessingStates((prev) => {
      const newMap = new Map(prev);
      newMap.delete(fileId);
      return newMap;
    });
  }, []);

  const clearAll = useCallback(() => {
    setProcessingStates(new Map());
  }, []);

  return {
    processingStates,
    processFiles,
    removeFile,
    clearAll,
  };
}
