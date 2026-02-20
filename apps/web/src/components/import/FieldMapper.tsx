"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Badge } from "@web/components/ui/badge";
import { Button } from "@web/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@web/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@web/components/ui/dialog";
import { Input } from "@web/components/ui/input";
import { Label } from "@web/components/ui/label";
import { listMappingPresets, createMappingPreset } from "@web/lib/api/import";
import type {
  FieldMapping,
  ImportTargetField,
  MappingPreset,
} from "@journey-os/types";
import {
  IMPORT_TARGET_FIELDS,
  REQUIRED_TARGET_FIELDS,
} from "@journey-os/types";

const SKIP_VALUE = "__skip__";

interface FieldMapperProps {
  readonly columns: readonly string[];
  readonly suggestedMappings: readonly FieldMapping[];
  readonly detectedFormat: "csv" | "qti" | "text";
  readonly onMappingsChange: (mappings: FieldMapping[]) => void;
  readonly onValidationChange: (isValid: boolean) => void;
}

export function FieldMapper({
  columns,
  suggestedMappings,
  detectedFormat,
  onMappingsChange,
  onValidationChange,
}: FieldMapperProps) {
  const [mappings, setMappings] = useState<
    Map<string, { target: ImportTargetField | null; confidence: number | null }>
  >(new Map());
  const [presets, setPresets] = useState<MappingPreset[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState("");

  // Initialize from suggested mappings
  useEffect(() => {
    const initial = new Map<
      string,
      { target: ImportTargetField | null; confidence: number | null }
    >();
    for (const col of columns) {
      const suggested = suggestedMappings.find((m) => m.source_column === col);
      initial.set(col, {
        target: suggested?.target_field ?? null,
        confidence: suggested?.confidence ?? null,
      });
    }
    setMappings(initial);
  }, [columns, suggestedMappings]);

  // Load presets
  useEffect(() => {
    async function loadPresets() {
      const result = await listMappingPresets();
      if (result.data) {
        setPresets(result.data);
      }
    }
    void loadPresets();
  }, []);

  // Notify parent of mapping changes
  useEffect(() => {
    const fieldMappings: FieldMapping[] = [];
    for (const [source, mapping] of mappings) {
      if (mapping.target) {
        fieldMappings.push({
          source_column: source,
          target_field: mapping.target,
          confidence: mapping.confidence,
        });
      }
    }
    onMappingsChange(fieldMappings);

    const mappedTargets = new Set(fieldMappings.map((m) => m.target_field));
    const allRequiredMapped = REQUIRED_TARGET_FIELDS.every((f) =>
      mappedTargets.has(f),
    );
    onValidationChange(allRequiredMapped);
  }, [mappings, onMappingsChange, onValidationChange]);

  const getUsedTargets = useCallback((): Set<ImportTargetField> => {
    const used = new Set<ImportTargetField>();
    for (const mapping of mappings.values()) {
      if (mapping.target) used.add(mapping.target);
    }
    return used;
  }, [mappings]);

  const handleTargetChange = useCallback(
    (sourceColumn: string, value: string) => {
      setMappings((prev) => {
        const next = new Map(prev);
        next.set(sourceColumn, {
          target: value === SKIP_VALUE ? null : (value as ImportTargetField),
          confidence: null,
        });
        return next;
      });
    },
    [],
  );

  const handleLoadPreset = useCallback(
    (presetId: string) => {
      const preset = presets.find((p) => p.id === presetId);
      if (!preset) return;

      setMappings((prev) => {
        const next = new Map(prev);
        // Reset all to null
        for (const col of columns) {
          next.set(col, { target: null, confidence: null });
        }
        // Apply preset mappings
        for (const m of preset.mappings) {
          if (next.has(m.source_column)) {
            next.set(m.source_column, {
              target: m.target_field,
              confidence: null,
            });
          }
        }
        return next;
      });
    },
    [presets, columns],
  );

  const handleSavePreset = useCallback(async () => {
    if (!presetName.trim()) return;

    const fieldMappings: FieldMapping[] = [];
    for (const [source, mapping] of mappings) {
      if (mapping.target) {
        fieldMappings.push({
          source_column: source,
          target_field: mapping.target,
          confidence: null,
        });
      }
    }

    const result = await createMappingPreset({
      name: presetName.trim(),
      mappings: fieldMappings,
      source_format: detectedFormat,
    });

    if (result.data) {
      setPresets((prev) => [result.data!, ...prev]);
      setSaveDialogOpen(false);
      setPresetName("");
    }
  }, [mappings, presetName, detectedFormat]);

  const getConfidenceBadge = (confidence: number | null) => {
    if (confidence === null) return null;
    if (confidence > 0.8)
      return (
        <Badge variant="default" className="bg-green-500 text-xs">
          {Math.round(confidence * 100)}%
        </Badge>
      );
    if (confidence >= 0.5)
      return (
        <Badge variant="default" className="bg-amber-500 text-xs">
          {Math.round(confidence * 100)}%
        </Badge>
      );
    return (
      <Badge variant="secondary" className="text-xs">
        {Math.round(confidence * 100)}%
      </Badge>
    );
  };

  const usedTargets = getUsedTargets();
  const mappedTargets = new Set(
    [...mappings.values()]
      .filter((m) => m.target !== null)
      .map((m) => m.target!),
  );
  const missingRequired = REQUIRED_TARGET_FIELDS.filter(
    (f) => !mappedTargets.has(f),
  );

  return (
    <div className="space-y-6">
      {/* Preset selector */}
      <div className="flex items-center gap-3">
        {presets.length > 0 && (
          <Select onValueChange={handleLoadPreset}>
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Load a saved preset..." />
            </SelectTrigger>
            <SelectContent>
              {presets.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Save as Preset
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Save Mapping Preset</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="preset-name">Preset Name</Label>
                <Input
                  id="preset-name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                  placeholder="e.g., ExamSoft CSV Format"
                />
              </div>
              <Button onClick={handleSavePreset} disabled={!presetName.trim()}>
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Mapping rows */}
      <div className="space-y-3">
        {columns.map((col) => {
          const mapping = mappings.get(col);
          const isRequired =
            mapping?.target && REQUIRED_TARGET_FIELDS.includes(mapping.target);

          return (
            <div
              key={col}
              className="flex items-center gap-3 rounded-md border p-3"
            >
              <span className="w-44 truncate text-sm font-medium">{col}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Select
                value={mapping?.target ?? SKIP_VALUE}
                onValueChange={(v) => handleTargetChange(col, v)}
              >
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SKIP_VALUE}>Skip (ignore)</SelectItem>
                  {IMPORT_TARGET_FIELDS.map((field) => (
                    <SelectItem
                      key={field}
                      value={field}
                      disabled={
                        usedTargets.has(field) && mapping?.target !== field
                      }
                    >
                      {field.replace(/_/g, " ")}
                      {REQUIRED_TARGET_FIELDS.includes(field) ? " *" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {getConfidenceBadge(mapping?.confidence ?? null)}
              {isRequired && (
                <span className="text-xs text-red-500">Required</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Validation errors */}
      {missingRequired.length > 0 && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-medium text-red-800">
            Missing required fields:
          </p>
          <ul className="mt-1 list-inside list-disc text-xs text-red-700">
            {missingRequired.map((f) => (
              <li key={f}>{f.replace(/_/g, " ")}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
