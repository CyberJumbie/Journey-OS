import type { SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import type {
  FieldMapping,
  ImportConfirmation,
  ImportJobStatus,
  ImportPreview,
  ImportTargetField,
  FileUploadResponse,
  ParsedQuestion,
} from "@journey-os/types";
import {
  IMPORT_TARGET_FIELDS,
  REQUIRED_TARGET_FIELDS,
} from "@journey-os/types";
import { ParserFactory } from "./parser-factory.service";
import {
  UploadNotFoundError,
  MappingIncompleteError,
} from "../../errors/import-mapping.errors";
import { stringSimilarity, FIELD_ALIASES } from "../../utils/levenshtein";

const IMPORT_BUCKET = "import-temp";
const AUTO_MAP_THRESHOLD = 0.5;

export class ImportUploadService {
  readonly #supabase: SupabaseClient;
  readonly #parserFactory: ParserFactory;

  constructor(supabase: SupabaseClient, parserFactory: ParserFactory) {
    this.#supabase = supabase;
    this.#parserFactory = parserFactory;
  }

  async upload(
    userId: string,
    file: {
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    },
  ): Promise<FileUploadResponse> {
    const uploadId = randomUUID();
    const storagePath = `${userId}/${uploadId}/${file.originalname}`;

    const { error } = await this.#supabase.storage
      .from(IMPORT_BUCKET)
      .upload(storagePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      throw new UploadNotFoundError(uploadId);
    }

    return {
      upload_id: uploadId,
      filename: file.originalname,
      size_bytes: file.size,
      storage_path: `${IMPORT_BUCKET}/${storagePath}`,
    };
  }

  async preview(
    userId: string,
    uploadId: string,
    previewRowCount: number = 5,
  ): Promise<ImportPreview> {
    const { data: files, error: listError } = await this.#supabase.storage
      .from(IMPORT_BUCKET)
      .list(`${userId}/${uploadId}`);

    if (listError || !files || files.length === 0) {
      throw new UploadNotFoundError(uploadId);
    }

    const filename = files[0]!.name;
    const storagePath = `${userId}/${uploadId}/${filename}`;

    const { data: fileData, error: downloadError } =
      await this.#supabase.storage.from(IMPORT_BUCKET).download(storagePath);

    if (downloadError || !fileData) {
      throw new UploadNotFoundError(uploadId);
    }

    const buffer = new Uint8Array(await fileData.arrayBuffer());
    const parseResult = await this.#parserFactory.parse(buffer, filename);

    const columns = this.#extractColumns(
      parseResult.questions,
      filename,
      buffer,
    );
    const allRows = this.#extractRows(parseResult.questions, columns);
    const previewRows = allRows.slice(0, previewRowCount);
    const suggestedMappings = this.#autoMap(columns);

    return {
      format: parseResult.format,
      columns,
      preview_rows: previewRows,
      total_rows: parseResult.totalFound,
      suggested_mappings: suggestedMappings,
      file_info: {
        filename,
        size_bytes: buffer.byteLength,
        upload_id: uploadId,
      },
    };
  }

  async confirm(
    userId: string,
    uploadId: string,
    mappings: readonly FieldMapping[],
  ): Promise<ImportConfirmation> {
    const missingRequired = this.#findMissingRequired(mappings);
    if (missingRequired.length > 0) {
      throw new MappingIncompleteError(missingRequired);
    }

    const { data: files, error: listError } = await this.#supabase.storage
      .from(IMPORT_BUCKET)
      .list(`${userId}/${uploadId}`);

    if (listError || !files || files.length === 0) {
      throw new UploadNotFoundError(uploadId);
    }

    const filename = files[0]!.name;
    const storagePath = `${userId}/${uploadId}/${filename}`;

    const { data: fileData, error: downloadError } =
      await this.#supabase.storage.from(IMPORT_BUCKET).download(storagePath);

    if (downloadError || !fileData) {
      throw new UploadNotFoundError(uploadId);
    }

    const buffer = new Uint8Array(await fileData.arrayBuffer());
    const parseResult = await this.#parserFactory.parse(buffer, filename);

    const mappedTargets = new Set(mappings.map((m) => m.target_field));
    const columns = this.#extractColumns(
      parseResult.questions,
      filename,
      buffer,
    );
    const mappedSources = new Set(mappings.map((m) => m.source_column));
    const unmappedColumns = columns.filter((c) => !mappedSources.has(c));

    const validationWarnings: string[] = [];
    const optionalFields = IMPORT_TARGET_FIELDS.filter(
      (f) => !REQUIRED_TARGET_FIELDS.includes(f) && !mappedTargets.has(f),
    );
    for (const field of optionalFields) {
      validationWarnings.push(`Optional field '${field}' is not mapped`);
    }

    const estimatedDuration = Math.max(
      1,
      Math.ceil(parseResult.totalFound / 12),
    );

    return {
      upload_id: uploadId,
      filename,
      format: parseResult.format,
      total_rows: parseResult.totalFound,
      mapped_fields: [...mappings],
      unmapped_columns: unmappedColumns,
      validation_warnings: validationWarnings,
      estimated_duration_seconds: estimatedDuration,
    };
  }

  async execute(
    userId: string,
    uploadId: string,
    mappings: readonly FieldMapping[],
    totalRows: number,
  ): Promise<ImportJobStatus> {
    const missingRequired = this.#findMissingRequired(mappings);
    if (missingRequired.length > 0) {
      throw new MappingIncompleteError(missingRequired);
    }

    // Placeholder — actual import pipeline deferred to STORY-F-57
    return {
      job_id: randomUUID(),
      status: "queued",
      progress_percent: 0,
      rows_processed: 0,
      rows_total: totalRows,
      errors: [],
      created_at: new Date().toISOString(),
    };
  }

  #autoMap(columns: readonly string[]): FieldMapping[] {
    const mappings: FieldMapping[] = [];
    const usedTargets = new Set<ImportTargetField>();

    // Build candidate list: for each column, score against all targets + aliases
    const candidates: Array<{
      source: string;
      target: ImportTargetField;
      score: number;
    }> = [];

    for (const col of columns) {
      for (const targetField of IMPORT_TARGET_FIELDS) {
        let bestScore = stringSimilarity(col, targetField);

        const aliases = FIELD_ALIASES[targetField];
        if (aliases) {
          for (const alias of aliases) {
            const aliasScore = stringSimilarity(col, alias);
            if (aliasScore > bestScore) {
              bestScore = aliasScore;
            }
          }
        }

        if (bestScore >= AUTO_MAP_THRESHOLD) {
          candidates.push({
            source: col,
            target: targetField,
            score: bestScore,
          });
        }
      }
    }

    // Sort by score descending — greedily assign best matches first
    candidates.sort((a, b) => b.score - a.score);
    const usedSources = new Set<string>();

    for (const candidate of candidates) {
      if (
        usedTargets.has(candidate.target) ||
        usedSources.has(candidate.source)
      ) {
        continue;
      }
      mappings.push({
        source_column: candidate.source,
        target_field: candidate.target,
        confidence: Math.round(candidate.score * 100) / 100,
      });
      usedTargets.add(candidate.target);
      usedSources.add(candidate.source);
    }

    return mappings;
  }

  #findMissingRequired(mappings: readonly FieldMapping[]): string[] {
    const mappedTargets = new Set(mappings.map((m) => m.target_field));
    return REQUIRED_TARGET_FIELDS.filter((f) => !mappedTargets.has(f));
  }

  #extractColumns(
    questions: readonly ParsedQuestion[],
    filename: string,
    buffer: Uint8Array,
  ): string[] {
    // For CSV, try to extract header row from raw buffer
    if (filename.endsWith(".csv")) {
      const text = new TextDecoder().decode(buffer);
      const firstLine = text.split("\n")[0];
      if (firstLine) {
        return firstLine.split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
      }
    }

    // Fallback: use rawMetadata keys from first parsed question
    if (questions.length > 0 && questions[0]!.rawMetadata) {
      return Object.keys(questions[0]!.rawMetadata);
    }

    return [];
  }

  #extractRows(
    questions: readonly ParsedQuestion[],
    columns: readonly string[],
  ): string[][] {
    return questions.map((q) =>
      columns.map((col) => {
        const value = q.rawMetadata[col];
        return value != null ? String(value) : "";
      }),
    );
  }
}
