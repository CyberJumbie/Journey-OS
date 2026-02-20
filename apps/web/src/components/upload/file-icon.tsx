"use client";

import { FileText, File, Presentation } from "lucide-react";

interface FileIconProps {
  readonly filename: string;
  readonly className?: string;
}

export function FileIcon({ filename, className = "h-5 w-5" }: FileIconProps) {
  const ext = filename.split(".").pop()?.toLowerCase();

  switch (ext) {
    case "pdf":
      return <FileText className={`${className} text-red-500`} />;
    case "pptx":
      return <Presentation className={`${className} text-orange-500`} />;
    case "docx":
      return <File className={`${className} text-blue-500`} />;
    default:
      return <File className={`${className} text-gray-400`} />;
  }
}
