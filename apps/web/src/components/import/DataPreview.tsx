"use client";

import { useEffect, useState } from "react";
import { Badge } from "@web/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@web/components/ui/table";
import { getImportPreview } from "@web/lib/api/import";
import type { ImportPreview } from "@journey-os/types";

interface DataPreviewProps {
  readonly uploadId: string;
  readonly onPreviewLoaded: (preview: ImportPreview) => void;
  readonly onError: (message: string) => void;
}

export function DataPreview({
  uploadId,
  onPreviewLoaded,
  onError,
}: DataPreviewProps) {
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadPreview() {
      setLoading(true);
      const result = await getImportPreview(uploadId);

      if (cancelled) return;

      if (result.error) {
        onError(result.error.message);
        setLoading(false);
        return;
      }

      if (result.data) {
        setPreview(result.data);
        onPreviewLoaded(result.data);
      }
      setLoading(false);
    }

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [uploadId, onPreviewLoaded, onError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Parsing file...</p>
      </div>
    );
  }

  if (!preview) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Badge variant="secondary">{preview.format.toUpperCase()}</Badge>
        <span className="text-sm text-muted-foreground">
          {preview.total_rows} rows detected
        </span>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {preview.columns.map((col) => (
                <TableHead key={col} className="text-xs font-medium">
                  {col}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {preview.preview_rows.map((row, rowIdx) => (
              <TableRow key={rowIdx}>
                {row.map((cell, cellIdx) => (
                  <TableCell
                    key={cellIdx}
                    className="max-w-48 truncate text-xs"
                  >
                    {cell}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground">
          Detected columns: {preview.columns.join(", ")}
        </p>
      </div>
    </div>
  );
}
