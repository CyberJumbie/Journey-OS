"use client";

import { useCallback, useState } from "react";
import { DropArea } from "./drop-area";
import { UploadProgressItem } from "./upload-progress-item";
import { uploadFiles } from "@web/services/upload.client";
import type { UploadFileStatus } from "@journey-os/types";
import {
  ACCEPTED_MIME_TYPES,
  UPLOAD_MAX_FILE_SIZE_BYTES,
  UPLOAD_MAX_FILES_PER_BATCH,
  type AcceptedMimeType,
} from "@journey-os/types";

interface FileEntry {
  readonly id: string;
  readonly file: File;
  readonly name: string;
  readonly size: number;
  progress: number;
  status: UploadFileStatus;
  error: string | null;
}

interface UploadDropzoneProps {
  readonly courseId: string;
  readonly token: string;
}

export function UploadDropzone({ courseId, token }: UploadDropzoneProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const handleFilesSelected = useCallback((selected: File[]) => {
    const validated: FileEntry[] = [];

    for (const file of selected) {
      const id = crypto.randomUUID();
      const isMimeValid = ACCEPTED_MIME_TYPES.includes(
        file.type as AcceptedMimeType,
      );
      const isSizeValid = file.size <= UPLOAD_MAX_FILE_SIZE_BYTES;

      if (!isMimeValid) {
        validated.push({
          id,
          file,
          name: file.name,
          size: file.size,
          progress: 0,
          status: "error",
          error: `File type ${file.type || "unknown"} is not supported. Accepted: PDF, PPTX, DOCX`,
        });
      } else if (!isSizeValid) {
        validated.push({
          id,
          file,
          name: file.name,
          size: file.size,
          progress: 0,
          status: "error",
          error: "File exceeds 50MB size limit",
        });
      } else {
        validated.push({
          id,
          file,
          name: file.name,
          size: file.size,
          progress: 0,
          status: "pending",
          error: null,
        });
      }
    }

    setFiles((prev) => {
      const combined = [...prev, ...validated];
      if (combined.length > UPLOAD_MAX_FILES_PER_BATCH) {
        return combined.slice(0, UPLOAD_MAX_FILES_PER_BATCH);
      }
      return combined;
    });
  }, []);

  const handleRemove = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const handleUpload = useCallback(async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "pending" ? { ...f, status: "uploading" as const } : f,
      ),
    );

    const result = await uploadFiles({
      courseId,
      files: pendingFiles.map((f) => f.file),
      token,
      onProgress: (_fileIndex, progress) => {
        setFiles((prev) =>
          prev.map((f) => (f.status === "uploading" ? { ...f, progress } : f)),
        );
      },
    });

    setFiles((prev) =>
      prev.map((f) => {
        if (f.status !== "uploading") return f;

        const serverError = result.data?.errors.find(
          (e) => e.filename === f.name,
        );
        if (serverError) {
          return {
            ...f,
            status: "error" as const,
            error: serverError.message,
            progress: 0,
          };
        }

        const serverSuccess = result.data?.files.find(
          (s) => s.filename === f.name,
        );
        if (serverSuccess) {
          return { ...f, status: "success" as const, progress: 100 };
        }

        if (result.error) {
          return {
            ...f,
            status: "error" as const,
            error: result.error.message,
            progress: 0,
          };
        }

        return { ...f, status: "success" as const, progress: 100 };
      }),
    );

    setIsUploading(false);
  }, [files, courseId, token]);

  const pendingCount = files.filter((f) => f.status === "pending").length;

  return (
    <div className="flex flex-col gap-4">
      <DropArea onFilesSelected={handleFilesSelected} disabled={isUploading} />

      {files.length > 0 && (
        <div className="flex flex-col gap-2">
          {files.map((f) => (
            <UploadProgressItem
              key={f.id}
              id={f.id}
              name={f.name}
              size={f.size}
              progress={f.progress}
              status={f.status}
              error={f.error}
              onRemove={handleRemove}
            />
          ))}
        </div>
      )}

      {pendingCount > 0 && (
        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading}
          className="self-end rounded-md bg-blue-mid px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-navy-deep disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isUploading
            ? "Uploading..."
            : `Upload ${pendingCount} file${pendingCount !== 1 ? "s" : ""}`}
        </button>
      )}
    </div>
  );
}
