import type { SupabaseClient } from "@supabase/supabase-js";
import type { UploadedFileRecord } from "@journey-os/types";
import { UploadError } from "../errors/upload.error";

const TABLE = "uploads";

interface CreateUploadRow {
  institution_id: string;
  course_id: string;
  uploaded_by: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  storage_path: string;
  document_type: string;
  parse_status: string;
}

export class UploadRepository {
  readonly #supabaseClient: SupabaseClient;

  constructor(supabaseClient: SupabaseClient) {
    this.#supabaseClient = supabaseClient;
  }

  async create(row: CreateUploadRow): Promise<UploadedFileRecord> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .insert(row)
      .select(
        "id, filename, content_type, size_bytes, storage_path, document_type, parse_status, created_at",
      )
      .single();

    if (error || !data) {
      throw new UploadError(
        `Failed to create upload record: ${error?.message ?? "unknown"}`,
      );
    }

    return data as unknown as UploadedFileRecord;
  }

  async findByCourseId(courseId: string): Promise<UploadedFileRecord[]> {
    const { data, error } = await this.#supabaseClient
      .from(TABLE)
      .select(
        "id, filename, content_type, size_bytes, storage_path, document_type, parse_status, created_at",
      )
      .eq("course_id", courseId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new UploadError(`Failed to list uploads: ${error.message}`);
    }

    return (data ?? []) as unknown as UploadedFileRecord[];
  }
}
