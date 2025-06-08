"use client";

import { useMutation } from "convex/react";
import { UploadCloudIcon, XIcon } from "lucide-react";
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
} from "@/components/ui/file-upload"; // Adjust this path to your file-upload component
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

function GpxFileIcon() {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: <explanation>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
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
      value={files}
      onValueChange={setFiles}
      onUpload={handleUpload}
      accept=".gpx"
      maxFiles={5}
      maxSize={8 * 1024 * 1024}
      onFileReject={(rejectedFile, message) => {
        toast.error(`Could not add ${rejectedFile.name}: ${message}`);
      }}
      className="text-center"
    >
      <FileUploadDropzone className="border-muted-foreground/20 py-8">
        <UploadCloudIcon className="mx-auto size-12 text-muted-foreground" />
        <p className="mt-4 font-semibold text-muted-foreground">Drag & drop GPX files here</p>
        <p className="text-xs text-muted-foreground/80">or</p>
        <FileUploadTrigger asChild>
          <Button size="sm" variant="outline" className="mt-2">
            Click to browse
          </Button>
        </FileUploadTrigger>
      </FileUploadDropzone>

      <FileUploadList className="mt-4">
        {files.map((file) => (
          <FileUploadItem key={file.name} value={file}>
            <FileUploadItemPreview render={() => <GpxFileIcon />}>
              <FileUploadItemProgress variant="fill" />
            </FileUploadItemPreview>
            <FileUploadItemMetadata />
            <FileUploadItemDelete asChild>
              <Button variant="ghost" size="icon" className="size-7">
                <XIcon className="size-4" />
              </Button>
            </FileUploadItemDelete>
          </FileUploadItem>
        ))}
      </FileUploadList>
    </FileUpload>
  );
}
