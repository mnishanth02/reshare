"use client";

import { useMutation } from "convex/react";
import { AnimatePresence } from "framer-motion";
import { UploadCloudIcon } from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadItemProgress,
  FileUploadList,
  FileUploadTrigger,
} from "@/components/ui/file-upload";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { MotionDiv } from "./MontionComp";

function GpxFileIcon() {
  return (
    <svg
      aria-label="GPX File Icon"
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
      <title>GPX File Icon</title>
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="M12 16.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9z" />
      <path d="m9 13 3 3 3-3" />
    </svg>
  );
}

interface GpxUploaderProps {
  journeyId: Id<"journeys">;
  variant?: "default" | "minimal";
  onUploadComplete?: () => void;
}

export function GpxUploader({
  journeyId,
  variant = "default",
  onUploadComplete,
}: GpxUploaderProps) {
  const [files, setFiles] = React.useState<File[]>([]);

  // This mutation pattern is very robust for file uploads.
  // 1. Create a placeholder activity in the DB.
  // 2. Get a secure URL to upload the file to.
  // 3. After upload, a backend function will process the file.
  const createPlaceholderActivity = useMutation(api.activities.mutations.createPlaceholder);

  const handleUpload = async (
    filesToUpload: File[],
    options: {
      onProgress: (file: File, progress: number) => void;
      onSuccess: (file: File) => void;
      onError: (file: File, error: Error) => void;
    }
  ) => {
    for (const file of filesToUpload) {
      try {
        // Step 1 & 2: Get upload URL from the placeholder mutation
        const activityId = await createPlaceholderActivity({
          journeyId: journeyId,
          activityType: "gpx",
          originalFileName: file.name,
        });

        // Step 3: Upload the file to the secure URL
        const result = await fetch(activityId, {
          method: "POST",
          headers: { "Content-Type": file.type },
          body: file,
        });

        if (!result.ok) {
          throw new Error(`Upload failed with status: ${result.status}`);
        }

        // The backend will now process the file asynchronously.
        // The UI will update automatically via the Convex query.
        options.onSuccess(file);
        toast.success(`${file.name} uploaded. Processing...`);
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed");
        options.onError(file, error);
        toast.error(`Failed to upload ${file.name}: ${error.message}`);
      }
    }
    onUploadComplete?.();
  };

  // Minimal variant for when activities already exist
  if (variant === "minimal") {
    return (
      <FileUpload
        className="pb-2"
        value={files}
        onValueChange={setFiles}
        onUpload={handleUpload}
        accept=".gpx"
        maxFiles={5}
        maxSize={8 * 1024 * 1024} // 8MB
      >
        <FileUploadTrigger asChild>
          <Button variant="default" className="w-full">
            Add GPX File
          </Button>
        </FileUploadTrigger>
      </FileUpload>
    );
  }

  // Default, larger dropzone variant
  return (
    <FileUpload
      accept=".gpx"
      multiple
      value={files}
      onValueChange={setFiles}
      onUpload={handleUpload}
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
              <span className="data-[dragging]:hidden">Upload GPX file</span>
              <span className="hidden data-[dragging]:inline">Drop your GPX file here</span>
            </h3>
            <p className="text-sm text-muted-foreground max-w-[14rem]">
              Drag and drop or click to upload your GPX track files
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
        {files.length > 0 && (
          <MotionDiv
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <FileUploadList className="mt-4">
              {files.map((file) => (
                <FileUploadItem key={file.name} value={file} className="px-4">
                  <FileUploadItemPreview>
                    <GpxFileIcon />
                  </FileUploadItemPreview>
                  <FileUploadItemMetadata>
                    <span className="font-medium">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(2)}kb
                    </span>
                  </FileUploadItemMetadata>
                  <FileUploadItemProgress />
                  <FileUploadItemDelete />
                </FileUploadItem>
              ))}
            </FileUploadList>
          </MotionDiv>
        )}
      </AnimatePresence>
    </FileUpload>
  );
}
