"use client";

import { X, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { FileIcon } from "./file-icon";
import type { UploadFileStatus } from "@journey-os/types";

interface UploadProgressItemProps {
  readonly id: string;
  readonly name: string;
  readonly size: number;
  readonly progress: number;
  readonly status: UploadFileStatus;
  readonly error: string | null;
  readonly onRemove: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function StatusIndicator({
  status,
  error,
}: {
  status: UploadFileStatus;
  error: string | null;
}) {
  switch (status) {
    case "uploading":
      return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
    case "success":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "error":
      return (
        <span
          className="flex items-center gap-1"
          title={error ?? "Upload failed"}
        >
          <AlertCircle className="h-4 w-4 text-red-500" />
        </span>
      );
    case "pending":
    default:
      return <span className="h-4 w-4 rounded-full border-2 border-gray-300" />;
  }
}

export function UploadProgressItem({
  id,
  name,
  size,
  progress,
  status,
  error,
  onRemove,
}: UploadProgressItemProps) {
  return (
    <div className="flex items-center gap-3 rounded-md border border-gray-200 p-3">
      <FileIcon filename={name} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="truncate text-sm font-medium text-gray-700">{name}</p>
          <span className="ml-2 shrink-0 text-xs text-gray-400">
            {formatBytes(size)}
          </span>
        </div>
        {status === "uploading" && (
          <div className="mt-1.5 h-1.5 w-full rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        {status === "error" && error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>
      <StatusIndicator status={status} error={error} />
      {(status === "pending" || status === "error") && (
        <button
          type="button"
          onClick={() => onRemove(id)}
          className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label={`Remove ${name}`}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
