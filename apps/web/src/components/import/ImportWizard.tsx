"use client";

import { useCallback, useState } from "react";
import { Button } from "@web/components/ui/button";
import { Badge } from "@web/components/ui/badge";
import { Progress } from "@web/components/ui/progress";
import { FileUploadZone } from "./FileUploadZone";
import { DataPreview } from "./DataPreview";
import { FieldMapper } from "./FieldMapper";
import { ImportSummary } from "./ImportSummary";
import { executeImport } from "@web/lib/api/import";
import type {
  FieldMapping,
  FileUploadResponse,
  ImportPreview,
  ImportJobStatus,
} from "@journey-os/types";

type WizardStep = "upload" | "preview" | "map" | "confirm" | "importing";

const STEP_LABELS: Record<WizardStep, string> = {
  upload: "Upload",
  preview: "Preview",
  map: "Map Fields",
  confirm: "Confirm",
  importing: "Import",
};

const STEPS: WizardStep[] = [
  "upload",
  "preview",
  "map",
  "confirm",
  "importing",
];

export function ImportWizard() {
  const [step, setStep] = useState<WizardStep>("upload");
  const [error, setError] = useState<string | null>(null);

  // Upload state
  const [uploadResult, setUploadResult] = useState<FileUploadResponse | null>(
    null,
  );

  // Preview state
  const [preview, setPreview] = useState<ImportPreview | null>(null);

  // Mapping state
  const [mappings, setMappings] = useState<FieldMapping[]>([]);
  const [mappingValid, setMappingValid] = useState(false);

  // Import state
  const [jobStatus, setJobStatus] = useState<ImportJobStatus | null>(null);

  const currentStepIndex = STEPS.indexOf(step);

  const handleUploadComplete = useCallback((result: FileUploadResponse) => {
    setUploadResult(result);
    setError(null);
    setStep("preview");
  }, []);

  const handlePreviewLoaded = useCallback((data: ImportPreview) => {
    setPreview(data);
    setError(null);
  }, []);

  const handleMappingsChange = useCallback((newMappings: FieldMapping[]) => {
    setMappings(newMappings);
  }, []);

  const handleValidationChange = useCallback((isValid: boolean) => {
    setMappingValid(isValid);
  }, []);

  const handleStartImport = useCallback(async () => {
    if (!uploadResult) return;
    setStep("importing");
    setError(null);

    // Using a placeholder course_id — STORY-F-57 will add course selection
    const result = await executeImport(
      uploadResult.upload_id,
      mappings,
      "00000000-0000-0000-0000-000000000000",
    );

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (result.data) {
      setJobStatus(result.data);
    }
  }, [uploadResult, mappings]);

  const handleError = useCallback((message: string) => {
    setError(message);
  }, []);

  const canGoNext = (): boolean => {
    switch (step) {
      case "upload":
        return uploadResult !== null;
      case "preview":
        return preview !== null;
      case "map":
        return mappingValid;
      case "confirm":
        return true;
      default:
        return false;
    }
  };

  const goNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setError(null);
      setStep(STEPS[nextIndex]!);
    }
  };

  const goBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setError(null);
      setStep(STEPS[prevIndex]!);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <Badge
              variant={
                i < currentStepIndex
                  ? "default"
                  : i === currentStepIndex
                    ? "default"
                    : "outline"
              }
              className={
                i < currentStepIndex
                  ? "bg-green-500"
                  : i === currentStepIndex
                    ? "bg-primary"
                    : ""
              }
            >
              {i + 1}. {STEP_LABELS[s]}
            </Badge>
            {i < STEPS.length - 1 && (
              <div className="h-px w-6 bg-muted-foreground/25" />
            )}
          </div>
        ))}
      </div>

      {/* Error display */}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Step content */}
      <div className="rounded-lg border bg-card p-6">
        {step === "upload" && (
          <div>
            <h2 className="mb-4 font-serif text-xl font-semibold">
              Upload File
            </h2>
            <FileUploadZone
              onUploadComplete={handleUploadComplete}
              onError={handleError}
            />
          </div>
        )}

        {step === "preview" && uploadResult && (
          <div>
            <h2 className="mb-4 font-serif text-xl font-semibold">
              Data Preview
            </h2>
            <DataPreview
              uploadId={uploadResult.upload_id}
              onPreviewLoaded={handlePreviewLoaded}
              onError={handleError}
            />
          </div>
        )}

        {step === "map" && preview && (
          <div>
            <h2 className="mb-4 font-serif text-xl font-semibold">
              Map Fields
            </h2>
            <FieldMapper
              columns={preview.columns}
              suggestedMappings={preview.suggested_mappings}
              detectedFormat={preview.format}
              onMappingsChange={handleMappingsChange}
              onValidationChange={handleValidationChange}
            />
          </div>
        )}

        {step === "confirm" && uploadResult && (
          <div>
            <h2 className="mb-4 font-serif text-xl font-semibold">
              Confirm Import
            </h2>
            <ImportSummary
              uploadId={uploadResult.upload_id}
              mappings={mappings}
              onStartImport={handleStartImport}
              onError={handleError}
            />
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4">
            <h2 className="font-serif text-xl font-semibold">Importing</h2>
            {jobStatus ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      jobStatus.status === "completed" ? "default" : "secondary"
                    }
                    className={
                      jobStatus.status === "completed" ? "bg-green-500" : ""
                    }
                  >
                    {jobStatus.status}
                  </Badge>
                </div>
                <Progress value={jobStatus.progress_percent} className="h-2" />
                <p className="text-sm text-muted-foreground">
                  {jobStatus.status === "queued"
                    ? "Import job queued. Processing will begin shortly..."
                    : `${jobStatus.rows_processed}/${jobStatus.rows_total} rows processed`}
                </p>
                {jobStatus.errors.length > 0 && (
                  <div className="rounded-md border border-red-200 bg-red-50 p-3">
                    <p className="text-sm font-medium text-red-800">Errors:</p>
                    <ul className="mt-1 list-inside list-disc text-xs text-red-700">
                      {jobStatus.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Starting import...
              </p>
            )}
          </div>
        )}
      </div>

      {/* Navigation buttons */}
      {step !== "importing" && (
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={goBack}
            disabled={currentStepIndex === 0}
          >
            Back
          </Button>
          {step !== "confirm" && (
            <Button onClick={goNext} disabled={!canGoNext()}>
              Next
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
