"use client";

import { useCallback, useState, useRef } from "react";
import { UploadCloud } from "lucide-react";
import type { AcceptedMimeType } from "@journey-os/types";
import { ACCEPTED_MIME_TYPES, ACCEPTED_EXTENSIONS } from "@journey-os/types";

interface DropAreaProps {
  readonly onFilesSelected: (files: File[]) => void;
  readonly disabled?: boolean;
}

export function DropArea({ onFilesSelected, disabled = false }: DropAreaProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!disabled) setIsDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (disabled) return;

      const droppedFiles = Array.from(e.dataTransfer.files);
      onFilesSelected(droppedFiles);
    },
    [disabled, onFilesSelected],
  );

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files ? Array.from(e.target.files) : [];
      if (selected.length > 0) onFilesSelected(selected);
      if (inputRef.current) inputRef.current.value = "";
    },
    [onFilesSelected],
  );

  const borderClass = isDragOver
    ? "border-blue-mid bg-blue-mid/5"
    : "border-border bg-white";

  const cursorClass = disabled
    ? "cursor-not-allowed opacity-50"
    : "cursor-pointer";

  return (
    <div
      role="button"
      tabIndex={0}
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 transition-colors ${borderClass} ${cursorClass}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleClick();
      }}
    >
      <UploadCloud className="h-10 w-10 text-text-muted" />
      <p className="text-sm text-text-secondary">
        {isDragOver ? "Drop files here" : "Drag & drop files here"}
      </p>
      <p className="text-xs text-text-muted">or click to browse</p>
      <p className="text-xs text-text-muted">PDF, PPTX, DOCX up to 50MB</p>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_EXTENSIONS.join(",")}
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />
    </div>
  );
}
