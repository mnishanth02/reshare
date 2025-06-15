"use client";

import { logger } from "@/lib/logger";
import { AnimatePresence } from "framer-motion";
import { UploadCloudIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  // FileUploadItemDelete, // Removed as cancellation is not yet supported by the hook
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
import type { Id } from "@/convex/_generated/dataModel";
import { type FileProcessingState, useGPXProcessor } from "@/hooks/use-gpx-processor"; // Import the hook and type
import { MAX_FILE_SIZE } from "@/lib/constants";
import { MotionDiv } from "./MontionComp";

function ActivityFileIcon() {
  return (
    <svg
      aria-label="Activity File Icon"
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-primary"
    >
      <title>Activity File Icon</title>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z" />
      <path d="m9 13 3 3 3-3" />
    </svg>
  );
}

interface ActivityUploaderProps {
  journeyId: Id<"journeys">;
  variant?: "default" | "minimal";
  activityType?: string;
  onUploadComplete?: (processedStates: Map<string, FileProcessingState>) => void;
}

// Helper function to map status to a progress value
function calculateProgress(status: FileProcessingState["status"]): number {
  switch (status) {
    case "pending":
      return 0;
    case "creating":
      return 10; // Placeholder created
    case "uploading":
      return 30; // File being uploaded
    case "processing":
      return 60; // Worker processing GPX
    case "completed":
      return 100;
    case "failed":
      return 100; // Or a specific error state visual, progress shows full for error too
    default:
      return 0;
  }
}

// Helper function to get user-friendly status text
function getStatusText(state: FileProcessingState): string {
  switch (state.status) {
    case "pending":
      return "Waiting...";
    case "creating":
      return "Initializing...";
    case "uploading":
      return "Uploading...";
    case "processing":
      return "Analyzing data...";
    case "completed":
      return "Complete ✓";
    case "failed":
      return `Failed: ${state.error || "Unknown error"}`;
    default:
      return "Unknown";
  }
}

// Custom progress component that accepts a value prop
interface CustomProgressProps {
  value: number;
  className?: string;
}

function CustomProgress({ value, className }: CustomProgressProps) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      aria-valuetext={`${value}%`}
      tabIndex={0}
      className={`relative h-1.5 w-full overflow-hidden rounded-full bg-primary/20 ${className || ""}`}
    >
      <div
        className="h-full w-full flex-1 bg-primary transition-transform duration-300 ease-linear"
        style={{
          transform: `translateX(-${100 - value}%)`,
        }}
      />
    </div>
  );
}

export function ActivityUploader({
  journeyId,
  variant = "default",
  activityType = "hiking",
  onUploadComplete,
}: ActivityUploaderProps) {
  // `selectedFiles` holds files chosen by the user, before they are passed to the processor
  // State for files selected in the UI before processing
  const [selectedFiles, setSelectedFiles] = React.useState<File[]>([]);

  // Hook for processing GPX files
  const { processFiles, processingStates } = useGPXProcessor(journeyId, activityType);

  // Memoize the processing states array to prevent unnecessary re-renders
  const filesToDisplay = React.useMemo(
    () => Array.from(processingStates.values()),
    [processingStates]
  );

  // Effect to call onUploadComplete when all files are processed or failed
  React.useEffect(() => {
    if (processingStates.size === 0) return; // No files processed yet

    const allDone = filesToDisplay.every(
      (state) => state.status === "completed" || state.status === "failed"
    );

    if (allDone) {
      logger.info("All files processing completed", {
        totalFiles: filesToDisplay.length,
        completed: filesToDisplay.filter((f) => f.status === "completed").length,
        failed: filesToDisplay.filter((f) => f.status === "failed").length,
        journeyId,
      });

      onUploadComplete?.(processingStates);

      // Optionally clear selectedFiles if they are not cleared by FileUpload component on its own
      // setSelectedFiles([]);
    }
  }, [filesToDisplay, processingStates, onUploadComplete, journeyId]); // filesToDisplay is derived from processingStates

  // This function is called by the FileUpload component when the user confirms their selection
  const handleInitiateUpload = async (currentFiles: File[]) => {
    if (currentFiles.length === 0) return;

    logger.info("User initiated file upload", {
      fileCount: currentFiles.length,
      fileNames: currentFiles.map((f) => f.name).join(", "),
      journeyId,
    });

    try {
      // The FileUpload component might manage its own list of files.
      // We take these files and pass them to our processor.
      const dataTransfer = new DataTransfer();
      for (const file of currentFiles) {
        dataTransfer.items.add(file);
      }
      const fileList = dataTransfer.files;

      await processFiles(fileList);

      logger.debug("File upload processing started", {
        fileCount: currentFiles.length,
        journeyId,
      });

      // Clear the selected files from the FileUpload component's input area
      // as they are now being managed by the processingStates for display in the list below.
      setSelectedFiles([]);
    } catch (error) {
      logger.error("Failed to process files", {
        error: error instanceof Error ? error.message : "Unknown error",
        fileCount: currentFiles.length,
        journeyId,
      });
      // Re-throw to allow error handling by the parent component
      throw error;
    }
  };

  // Minimal variant for when activities already exist
  if (variant === "minimal") {
    return (
      <FileUpload
        className="pb-2"
        value={selectedFiles}
        onValueChange={setSelectedFiles}
        onUpload={handleInitiateUpload}
        accept=".gpx,.tcx,.fit,.kml,.kmz"
        maxFiles={5}
        maxSize={MAX_FILE_SIZE.GPX} // 50MB - increased for large FIT files and KMZ archives
      >
        <FileUploadTrigger asChild>
          <Button variant="default" className="w-full">
            Add Activity File
          </Button>
        </FileUploadTrigger>
      </FileUpload>
    );
  }

  // Default, larger dropzone variant
  return (
    <FileUpload
      accept=".gpx,.tcx,.fit,.kml,.kmz"
      multiple
      value={selectedFiles} // Controlled by selectedFiles state
      onValueChange={setSelectedFiles} // Updates selectedFiles when user adds/removes files in the UI
      onUpload={handleInitiateUpload} // Called when user confirms upload
      maxSize={MAX_FILE_SIZE.GPX} // 50MB - increased for large FIT files and KMZ archives
    >
      <FileUploadDropzone className="w-full min-h-[200px] flex flex-col items-center justify-center p-4 rounded-lg border-2 border-dashed transition-colors hover:border-primary/50 data-[dragging]:border-primary/30 data-[dragging]:bg-accent/30 hover:cursor-pointer">
        <MotionDiv
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col items-center justify-center text-center gap-2"
        >
          <MotionDiv className="data-[dragging]:scale-110 data-[dragging]:animate-pulse transition-transform duration-200">
            <UploadCloudIcon className="w-12 h-12 text-primary/80" />
          </MotionDiv>
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-1"
          >
            <h3 className="text-lg font-semibold">
              <span className="data-[dragging]:hidden">Upload activity files</span>
              <span className="hidden data-[dragging]:inline">Drop your activity files here</span>
            </h3>
            <p className="text-sm text-muted-foreground max-w-[16rem]">
              Drag and drop or click to upload GPX, TCX, FIT, KML, or KMZ files
            </p>
          </MotionDiv>
          {variant === "default" && (
            <MotionDiv
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <FileUploadTrigger asChild>
                <Button size="sm" variant="default" className="mt-2 hover:cursor-pointer">
                  Browse files
                </Button>
              </FileUploadTrigger>
            </MotionDiv>
          )}
        </MotionDiv>
      </FileUploadDropzone>

      <AnimatePresence mode="popLayout">
        {filesToDisplay.length > 0 && (
          <MotionDiv
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <FileUploadList className="mt-4">
              {filesToDisplay.map((state) => (
                <FileUploadItem key={state.fileId} value={state.file} className="px-4">
                  <FileUploadItemPreview>
                    <ActivityFileIcon />
                  </FileUploadItemPreview>
                  <FileUploadItemMetadata>
                    <span className="font-medium">{state.fileName}</span>
                    <span className="text-xs text-muted-foreground">
                      {(state.file.size / 1024).toFixed(2)}kb - {getStatusText(state)}
                      {state.error && (
                        <span className="text-destructive"> Error: {state.error}</span>
                      )}
                    </span>
                  </FileUploadItemMetadata>
                  <CustomProgress value={calculateProgress(state.status)} />
                  {/*
                    TODO: Implement cancellation. This would require:
                    1. A way to signal cancellation to the useGPXProcessor hook.
                    2. The hook to terminate the worker and any ongoing Convex operations for that fileId.
                    3. Updating the file's status to 'cancelled' or removing it.
                  <FileUploadItemDelete />
                  */}
                </FileUploadItem>
              ))}
            </FileUploadList>
          </MotionDiv>
        )}
      </AnimatePresence>
    </FileUpload>
  );
}

// Export with both names for backward compatibility
export const GpxUploader = ActivityUploader;
