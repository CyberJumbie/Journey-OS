import { randomUUID } from 'crypto';
import type { UploadRow } from '@journey-os/shared-types';
import { UploadRepository } from '../repositories/upload.repository';
import { PdfParserFactory } from '../ingestion/PdfParserFactory';
import type { ParsedDocument } from '../ingestion/parsers/IPdfParser.interface';
import { config } from '../config/config';

const BUCKET_NAME = 'raw-uploads';
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB
const ALLOWED_MIME_TYPES = ['application/pdf'];

export interface UploadResult {
  upload_id: string;
  status: 'pending';
}

export class UploadService {
  private readonly uploadRepository: UploadRepository;

  constructor() {
    this.uploadRepository = new UploadRepository();
  }

  async uploadFile(params: {
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number };
    courseId: string;
    institutionId: string;
    uploadedBy: string;
  }): Promise<UploadResult> {
    const { file, courseId, institutionId, uploadedBy } = params;

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new UploadValidationError('Only PDF files are allowed');
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      throw new UploadValidationError(`File size exceeds maximum of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`);
    }

    const uploadId = randomUUID();
    const storagePath = `${institutionId}/${courseId}/${uploadId}/${file.originalname}`;

    // Upload file to Supabase Storage
    await this.uploadRepository.uploadFileToStorage(
      BUCKET_NAME,
      storagePath,
      file.buffer,
      file.mimetype,
    );

    // Create upload record in database
    const upload = await this.uploadRepository.create({
      institution_id: institutionId,
      course_id: courseId,
      uploaded_by: uploadedBy,
      storage_path: storagePath,
      original_filename: file.originalname,
      mime_type: file.mimetype,
      file_size_bytes: file.size,
    });

    return {
      upload_id: upload.id,
      status: 'pending',
    };
  }

  async getUpload(id: string): Promise<UploadRow | null> {
    return this.uploadRepository.findById(id);
  }

  /**
   * Parse a previously uploaded PDF.
   * Uses PdfParserFactory with automatic fallback chain.
   */
  async parseUpload(uploadId: string): Promise<ParsedDocument> {
    const upload = await this.uploadRepository.findById(uploadId);
    if (!upload) {
      throw new Error(`Upload not found: ${uploadId}`);
    }

    if (upload.status !== 'pending') {
      throw new UploadValidationError(`Upload is already ${upload.status}`);
    }

    // Update status to processing
    await this.uploadRepository.updateStatus(uploadId, 'processing');

    try {
      // Download file from Supabase Storage
      const fileBuffer = await this.uploadRepository.downloadFileFromStorage(
        BUCKET_NAME,
        upload.storage_path,
      );

      // Create parser with fallback chain
      const parser = PdfParserFactory.createWithFallback({
        llamaparse_key: config.LLAMAPARSE_API_KEY,
        use_python_service: false, // Python service not yet deployed
      });

      const parsed = await parser.parse(fileBuffer, upload.original_filename ?? 'document.pdf');

      // Warn if tables exist but last-resort parser was used
      if (parsed.has_tables && parsed.extraction_method === 'pdf-parse') {
        console.warn(
          `[UploadService] PDF parsed with pdf-parse (last resort) but contains tables. ` +
            `Table data may be degraded for upload ${uploadId}.`,
        );
      }

      // Update status to completed
      await this.uploadRepository.updateStatus(uploadId, 'completed');

      return parsed;
    } catch (err) {
      await this.uploadRepository.updateStatus(uploadId, 'failed');
      throw err;
    }
  }
}

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadValidationError';
  }
}
