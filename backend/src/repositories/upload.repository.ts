import type { SupabaseClient } from '@supabase/supabase-js';
import type { UploadRow } from '@journey-os/shared-types';
import SupabaseClientSingleton from '../lib/SupabaseClient';

export interface UploadInsertData {
  institution_id: string;
  course_id: string;
  uploaded_by: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size_bytes: number;
}

export class UploadRepository {
  private readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = SupabaseClientSingleton.getInstance();
  }

  async create(data: UploadInsertData): Promise<UploadRow> {
    const { data: row, error } = await this.supabase
      .from('uploads')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create upload record: ${error.message}`);
    }

    return row as UploadRow;
  }

  async findById(id: string): Promise<UploadRow | null> {
    const { data: row, error } = await this.supabase
      .from('uploads')
      .select()
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // not found
      throw new Error(`Failed to fetch upload: ${error.message}`);
    }

    return row as UploadRow;
  }

  async updateStatus(id: string, status: 'pending' | 'processing' | 'completed' | 'failed'): Promise<void> {
    const { error } = await this.supabase
      .from('uploads')
      .update({ status })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to update upload status: ${error.message}`);
    }
  }

  async uploadFileToStorage(
    bucket: string,
    path: string,
    fileBuffer: Buffer,
    contentType: string,
  ): Promise<string> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(path, fileBuffer, {
        contentType,
        upsert: false, // WORM: write-once, no overwrites
      });

    if (error) {
      throw new Error(`Failed to upload file to storage: ${error.message}`);
    }

    return path;
  }

  async downloadFileFromStorage(
    bucket: string,
    path: string,
  ): Promise<Buffer> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .download(path);

    if (error || !data) {
      throw new Error(`Failed to download file from storage: ${error?.message ?? 'No data returned'}`);
    }

    // Convert Blob to Buffer
    const arrayBuffer = await data.arrayBuffer();
    return Buffer.from(new Uint8Array(arrayBuffer));
  }
}
