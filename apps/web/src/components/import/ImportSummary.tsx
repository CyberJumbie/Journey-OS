"use client";

import { useEffect, useState } from "react";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@web/components/ui/table";
import { confirmImport } from "@web/lib/api/import";
import type { FieldMapping, ImportConfirmation } from "@journey-os/types";

interface ImportSummaryProps {
  readonly uploadId: string;
  readonly mappings: readonly FieldMapping[];
  readonly onStartImport: () => void;
  readonly onError: (message: string) => void;
}

export function ImportSummary({
  uploadId,
  mappings,
  onStartImport,
  onError,
}: ImportSummaryProps) {
  const [confirmation, setConfirmation] = useState<ImportConfirmation | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadConfirmation() {
      setLoading(true);
      const result = await confirmImport(uploadId, mappings);

      if (cancelled) return;

      if (result.error) {
        onError(result.error.message);
        setLoading(false);
        return;
      }

      if (result.data) {
        setConfirmation(result.data);
      }
      setLoading(false);
    }

    void loadConfirmation();
    return () => {
      cancelled = true;
    };
  }, [uploadId, mappings, onError]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Validating mappings...</p>
      </div>
    );
  }

  if (!confirmation) return null;

  return (
    <div className="space-y-6">
      {/* File info */}
      <div className="rounded-md border p-4">
        <h3 className="text-sm font-semibold">File Information</h3>
        <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Filename</p>
            <p className="font-medium">{confirmation.filename}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Format</p>
            <Badge variant="secondary">
              {confirmation.format.toUpperCase()}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground">Total Rows</p>
            <p className="font-medium">{confirmation.total_rows}</p>
          </div>
        </div>
      </div>

      {/* Mapped fields */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Source Column</TableHead>
              <TableHead className="text-xs">Target Field</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {confirmation.mapped_fields.map((m) => (
              <TableRow key={m.source_column}>
                <TableCell className="text-sm">{m.source_column}</TableCell>
                <TableCell className="text-sm">
                  {m.target_field.replace(/_/g, " ")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Unmapped columns */}
      {confirmation.unmapped_columns.length > 0 && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-800">
            Unmapped columns (will be ignored):
          </p>
          <p className="mt-1 text-xs text-amber-700">
            {confirmation.unmapped_columns.join(", ")}
          </p>
        </div>
      )}

      {/* Warnings */}
      {confirmation.validation_warnings.length > 0 && (
        <div className="space-y-1">
          {confirmation.validation_warnings.map((w, i) => (
            <p key={i} className="text-xs text-muted-foreground">
              {w}
            </p>
          ))}
        </div>
      )}

      {/* Estimated time + import button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Estimated time: ~{confirmation.estimated_duration_seconds} seconds
        </p>
        <Button size="lg" onClick={onStartImport}>
          Start Import
        </Button>
      </div>
    </div>
  );
}
