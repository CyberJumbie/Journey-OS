import { UploadRepository } from '../repositories/upload.repository';
import { ChunkRepository } from '../repositories/chunk.repository';
import { PdfParserFactory } from '../ingestion/PdfParserFactory';
import { ChunkerService } from '../ingestion/ChunkerService';
import { ClassifierNode } from '../ingestion/ClassifierNode';
import { ConceptExtractorNode } from '../ingestion/ConceptExtractorNode';
import { EmbedderService } from '../ingestion/EmbedderService';
import { FrameworkAligner } from '../ingestion/FrameworkAligner';
import { config } from '../config/config';

const BUCKET_NAME = 'raw-uploads';

export interface IngestionResult {
  upload_id: string;
  extraction_method: string;
  page_count: number;
  total_chunks: number;
  academic_chunks: number;
  noise_chunks: number;
  concepts_extracted: number;
  system_matches: number;
  discipline_matches: number;
}

/**
 * IngestionService — orchestrates the full ingestion pipeline:
 *
 * Upload PDF -> Parse -> Chunk -> Classify -> Embed -> Extract Concepts -> Align
 *
 * This is the single entry point for the complete pipeline.
 */
export class IngestionService {
  private readonly uploadRepository: UploadRepository;
  private readonly chunkRepository: ChunkRepository;
  private readonly chunkerService: ChunkerService;
  private readonly classifierNode: ClassifierNode;
  private readonly conceptExtractorNode: ConceptExtractorNode;
  private readonly embedderService: EmbedderService;
  private readonly frameworkAligner: FrameworkAligner;

  constructor() {
    this.uploadRepository = new UploadRepository();
    this.chunkRepository = new ChunkRepository();
    this.chunkerService = new ChunkerService();
    this.classifierNode = new ClassifierNode();
    this.conceptExtractorNode = new ConceptExtractorNode();
    this.embedderService = new EmbedderService();
    this.frameworkAligner = new FrameworkAligner();
  }

  /**
   * Run the full ingestion pipeline for an upload.
   */
  async ingest(uploadId: string): Promise<IngestionResult> {
    // Step 1: Retrieve the upload record
    const upload = await this.uploadRepository.findById(uploadId);
    if (!upload) {
      throw new Error(`Upload not found: ${uploadId}`);
    }

    if (upload.status !== 'pending') {
      throw new Error(`Upload is already ${upload.status}`);
    }

    await this.uploadRepository.updateStatus(uploadId, 'processing');

    try {
      // Step 2: Download and parse PDF
      const fileBuffer = await this.uploadRepository.downloadFileFromStorage(
        BUCKET_NAME,
        upload.storage_path,
      );

      const parser = PdfParserFactory.createWithFallback({
        llamaparse_key: config.LLAMAPARSE_API_KEY,
        use_python_service: false,
      });

      const parsed = await parser.parse(fileBuffer, upload.original_filename ?? 'document.pdf');

      // Warn if tables exist but last-resort parser was used
      if (parsed.has_tables && parsed.extraction_method === 'pdf-parse') {
        console.warn(
          `[IngestionService] PDF parsed with pdf-parse (last resort) but contains tables. ` +
            `Table data may be degraded for upload ${uploadId}.`,
        );
      }

      // Step 3: Chunk the markdown
      const chunkOutputs = this.chunkerService.chunk(parsed.markdown, 'syllabus');

      // Step 4: Persist chunks to Supabase
      const chunkInserts = chunkOutputs.map((c) => ({
        upload_id: uploadId,
        course_id: upload.course_id ?? '',
        institution_id: upload.institution_id ?? '',
        chunk_index: c.chunk_index,
        content: c.content,
        token_count: c.token_count,
        source_type: c.source_type as 'syllabus' | 'lecture_slide' | 'textbook' | 'other',
      }));

      const savedChunks = await this.chunkRepository.createMany(chunkInserts);

      // Step 5: Classify chunks (Stage 1)
      const classified = await this.classifierNode.classify(savedChunks);

      // Step 6: Embed academic chunks (both providers)
      await this.embedderService.embedChunks(classified.academic);

      // Step 7: Extract concepts from academic chunks (Stage 2)
      const concepts = await this.conceptExtractorNode.extract(classified.academic);

      // Step 8: Align concepts to USMLE frameworks
      const alignment = await this.frameworkAligner.align(concepts);

      // Step 9: Mark upload as completed
      await this.uploadRepository.updateStatus(uploadId, 'completed');

      return {
        upload_id: uploadId,
        extraction_method: parsed.extraction_method,
        page_count: parsed.page_count,
        total_chunks: savedChunks.length,
        academic_chunks: classified.academic.length,
        noise_chunks: classified.noise.length,
        concepts_extracted: concepts.length,
        system_matches: alignment.systemMatches,
        discipline_matches: alignment.disciplineMatches,
      };
    } catch (err) {
      await this.uploadRepository.updateStatus(uploadId, 'failed');
      throw err;
    }
  }
}
