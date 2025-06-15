// hooks/useGPXProcessor.ts

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MAX_FILE_SIZE } from "@/lib/constants";
import { logger } from "@/lib/logger";
import { useAction, useMutation } from "convex/react";
import { useCallback, useState } from "react";

// ==================================
// TYPE DEFINITIONS ("The Contract")
// ==================================
// This section defines the structure of the data we expect back from the
// Convex action. Processing is now done server-side.

// --- Status types for the UI ---

// Type definitions are clear and effective.
export type ProcessingStatus =
  | "pending" // Waiting in the queue
  | "creating" // Creating placeholder in DB
  | "uploading" // Uploading to file storage
  | "processing" // Convex action is running
  | "completed" // Action finished successfully
  | "failed"; // An error occurred

export interface FileProcessingState {
  fileId: string; // Unique client-side ID for this upload job
  file: File;
  fileName: string;
  status: ProcessingStatus;
  error?: string;
  activityId?: Id<"activities">;
}

// ==================================
// THE HOOK
// ==================================

/**
 * A custom hook to manage file processing using a web worker and saving to Convex.
 * Implements a "create-then-update" pattern for a responsive UI.
 * @param journeyId - The ID of the journey to associate activities with.
 * @param defaultActivityType - The default activity type to use for all files.
 */
export function useGPXProcessor(journeyId: Id<"journeys">, defaultActivityType = "hiking") {
  const [processingStates, setProcessingStates] = useState<Map<string, FileProcessingState>>(
    new Map()
  );

  // --- CONVEX MUTATIONS AND ACTIONS ---
  const createPlaceholder = useMutation(api.activities.mutations.createPlaceholder);
  const processActivityFileAction = useAction(api.activities.actions.processActivityFile);
  const failProcessing = useMutation(api.activities.mutations.markProcessingFailed);
  const generateUploadUrl = useMutation(api.storage.mutations.generateUploadUrl);

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

  // --- CORE PROCESSING LOGIC (SIMPLIFIED FOR CONVEX ACTIONS) ---

  const processSingleFile = useCallback(
    async (file: File, fileId: string) => {
      let activityId: Id<"activities"> | undefined;
      const startTime = performance.now();

      logger.info(`Starting to process file: ${file.name}`, {
        fileId,
        journeyId,
        fileSize: file.size,
        fileType: file.type,
      });

      try {
        // ===== STEP 1: CREATE PLACEHOLDER IN CONVEX =====
        updateState(fileId, { status: "creating" });
        logger.debug("Creating placeholder in Convex", { fileId, status: "creating" });

        activityId = await createPlaceholder({
          journeyId,
          originalFileName: file.name,
          activityType: defaultActivityType,
        });

        logger.success("Placeholder created successfully", {
          fileId,
          activityId,
          status: "uploading",
        });
        updateState(fileId, { status: "uploading", activityId });

        // ===== STEP 2: UPLOAD FILE =====
        logger.debug("Generating upload URL", { fileId });
        const uploadUrl = await generateUploadUrl();

        // Determine appropriate content type based on file extension
        const getContentType = (fileName: string): string => {
          const ext = fileName.toLowerCase().split(".").pop();
          switch (ext) {
            case "gpx":
              return "application/gpx+xml";
            case "tcx":
              return "application/vnd.garmin.tcx+xml";
            case "fit":
              return "application/vnd.ant.fit";
            case "kml":
              return "application/vnd.google-earth.kml+xml";
            case "kmz":
              return "application/vnd.google-earth.kmz";
            default:
              return file.type || "application/octet-stream";
          }
        };

        const contentType = getContentType(file.name);

        logger.debug("Uploading file to storage", {
          fileId,
          contentType,
          size: file.size,
        });

        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type": contentType,
          },
          body: file,
        });

        if (!result.ok) {
          const errorText = await result.text();
          throw new Error(`Upload failed with status: ${result.status}, ${errorText}`);
        }

        const { storageId } = await result.json();
        logger.success("File uploaded successfully", { fileId, storageId });

        // ===== STEP 3: PROCESS FILE WITH CONVEX ACTION =====
        updateState(fileId, { status: "processing" });
        logger.debug("Processing file with Convex action", { fileId, activityId });

        const actionResult = await processActivityFileAction({
          storageId,
          fileExtension: file.name.split(".").pop() || "",
          activityId,
        });

        if (!actionResult.success) {
          throw new Error(actionResult.error || "Backend processing failed.");
        }

        const totalTime = performance.now() - startTime;

        logger.success("Activity processed and saved successfully", {
          fileId,
          activityId,
          totalProcessingTime: `${(totalTime / 1000).toFixed(2)}s`,
        });

        updateState(fileId, { status: "completed" });
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
        const totalTime = performance.now() - startTime;

        logger.error(`Failed to process file: ${file.name}`, {
          fileId,
          activityId,
          error: errorMessage,
          timeElapsed: `${(totalTime / 1000).toFixed(2)}s`,
          stack: e instanceof Error ? e.stack : undefined,
        });

        updateState(fileId, { status: "failed", error: errorMessage });

        // If we managed to create a placeholder, mark it as failed in the DB
        if (activityId) {
          try {
            await failProcessing({ activityId, error: errorMessage });
            logger.warn("Marked activity as failed in database", { activityId, fileId });
          } catch (dbError) {
            logger.error("Failed to mark activity as failed in database", {
              activityId,
              fileId,
              error: dbError instanceof Error ? dbError.message : String(dbError),
            });
          }
        }
      }
    },
    [
      journeyId,
      defaultActivityType,
      createPlaceholder,
      processActivityFileAction,
      failProcessing,
      generateUploadUrl,
      updateState,
    ]
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const processFiles = useCallback(
    async (files: FileList): Promise<void> => {
      logger.info(`Processing ${files.length} file(s)`, {
        journeyId,
        fileCount: files.length,
        fileNames: Array.from(files)
          .map((f) => f.name)
          .join(", "),
      });

      if (files.length === 0) {
        logger.warn("No files provided for processing");
        return;
      }

      const fileArray = Array.from(files);
      const initialStates = new Map<string, FileProcessingState>();
      const filesToProcess: { file: File; fileId: string }[] = [];

      // Prepare files for processing
      for (const file of fileArray) {
        // Validate file before processing
        if (file.size === 0) {
          logger.error("File is empty", { fileName: file.name });
          continue;
        }

        if (file.size > MAX_FILE_SIZE.GPX) {
          // 50MB limit
          logger.error("File too large", { fileName: file.name, size: file.size });
          continue;
        }

        // Validate file extension
        const validExtensions = ["gpx", "tcx", "fit", "kml", "kmz"];
        const fileExtension = file.name.split(".").pop()?.toLowerCase();
        if (!fileExtension || !validExtensions.includes(fileExtension)) {
          logger.error("Invalid file extension", {
            fileName: file.name,
            extension: fileExtension,
            validExtensions: validExtensions.join(", "),
          });
          continue;
        }

        // Create a unique ID for this specific upload+process job
        const fileId = `${file.name}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

        logger.debug("Preparing file for processing", {
          fileId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        });

        initialStates.set(fileId, {
          fileId,
          file,
          fileName: file.name,
          status: "pending",
        });

        filesToProcess.push({ file, fileId });
      }

      // Update the state with all files in pending state
      logger.debug("Setting initial processing states", {
        fileCount: filesToProcess.length,
        fileIds: filesToProcess.map((f) => f.fileId).join(", "),
      });

      setProcessingStates(initialStates);

      // Process files in parallel
      logger.info("Starting parallel processing of files", {
        fileCount: filesToProcess.length,
        fileNames: filesToProcess.map((f) => f.file.name).join(", "),
      });

      try {
        await Promise.all(
          filesToProcess.map(({ file, fileId }) =>
            processSingleFile(file, fileId).catch((error) => {
              logger.error(`Error in parallel processing of file ${file.name}`, {
                fileId,
                error: error instanceof Error ? error.message : String(error),
              });
              // Re-throw to maintain error propagation
              throw error;
            })
          )
        );

        logger.success("All files processed successfully", {
          fileCount: filesToProcess.length,
          journeyId,
        });
      } catch (error) {
        logger.error("Error during parallel file processing", {
          error: error instanceof Error ? error.message : String(error),
          filesProcessed: filesToProcess.length,
          journeyId,
        });
        // Re-throw to allow error handling by the caller
        throw error;
      }
    },
    [processSingleFile] // Only include stable dependencies
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
