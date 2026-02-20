"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, X } from "lucide-react";
import { Button } from "@web/components/ui/button";
import { Progress } from "@web/components/ui/progress";
import { uploadImportFile } from "@web/lib/api/import";
import type { FileUploadResponse } from "@journey-os/types";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_EXTENSIONS = [".csv", ".xml", ".txt"];

interface FileUploadZoneProps {
  readonly onUploadComplete: (result: FileUploadResponse) => void;
  readonly onError: (message: string) => void;
}

export function FileUploadZone({
  onUploadComplete,
  onError,
}: FileUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): boolean => {
      if (file.size > MAX_FILE_SIZE) {
        onError("File size exceeds 10MB limit");
        return false;
      }
      const ext = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
      if (!ACCEPTED_EXTENSIONS.includes(ext)) {
        onError("Unsupported file type. Accepted: CSV, XML (QTI), or TXT");
        return false;
      }
      return true;
    },
    [onError],
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!validateFile(file)) return;

      setSelectedFile({ name: file.name, size: file.size });
      setUploading(true);
      setUploadProgress(30);

      const result = await uploadImportFile(file);
      setUploadProgress(100);

      if (result.error) {
        onError(result.error.message);
        setUploading(false);
        setSelectedFile(null);
        return;
      }

      if (result.data) {
        setUploading(false);
        onUploadComplete(result.data);
      }
    },
    [validateFile, onError, onUploadComplete],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        void handleFile(file);
      }
    },
    [handleFile],
  );

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setUploadProgress(0);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
      >
        <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">
          Drag and drop a file here, or click to browse
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          CSV, XML (QTI), or TXT — Max 10MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xml,.txt"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>

      {uploading && (
        <div className="space-y-2">
          <Progress value={uploadProgress} className="h-2" />
          <p className="text-xs text-muted-foreground">Uploading...</p>
        </div>
      )}

      {selectedFile && !uploading && (
        <div className="flex items-center gap-3 rounded-md border p-3">
          <FileText className="h-5 w-5 text-primary" />
          <div className="flex-1">
            <p className="text-sm font-medium">{selectedFile.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatSize(selectedFile.size)}
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClear}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
