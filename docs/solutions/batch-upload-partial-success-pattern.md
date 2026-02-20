---
name: batch-upload-partial-success-pattern
tags: [upload, multer, batch, partial-success, file-validation]
story: STORY-F-9
date: 2026-02-20
---
# Batch Upload with Partial Success Pattern

When an endpoint processes multiple files (or items) in a single request, some may succeed while others fail validation. Rather than aborting the entire batch on the first failure, process each item independently and return both successes and errors.

## Solution

### 1. Middleware: multer with limits

```typescript
// middleware/upload.validation.ts
import multer from "multer";
import { ACCEPTED_MIME_TYPES, UPLOAD_MAX_FILE_SIZE_BYTES, UPLOAD_MAX_FILES_PER_BATCH } from "@journey-os/types";

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (ACCEPTED_MIME_TYPES.includes(file.mimetype as AcceptedMimeType)) {
    cb(null, true);
  } else {
    cb(new InvalidFileTypeError(file.originalname, file.mimetype, ACCEPTED_MIME_TYPES));
  }
};

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: UPLOAD_MAX_FILE_SIZE_BYTES,  // Always set — prevents unbounded memory
    files: UPLOAD_MAX_FILES_PER_BATCH,
  },
  fileFilter,
});

export const uploadFiles = uploadMiddleware.array("files", UPLOAD_MAX_FILES_PER_BATCH);
```

### 2. Service: per-item try/catch with dual arrays

```typescript
// services/upload/upload.service.ts
async processUpload(files: Express.Multer.File[], context: UploadContext): Promise<UploadResponse> {
  const uploaded: UploadedFileRecord[] = [];
  const errors: UploadFileError[] = [];

  for (const file of files) {
    try {
      const record = await this.#processFile(file, context);
      uploaded.push(record);
    } catch (err) {
      if (err instanceof InvalidFileTypeError) {
        errors.push({ filename: file.originalname, code: "INVALID_FILE_TYPE", message: err.message });
      } else if (err instanceof UploadFileSizeLimitError) {
        errors.push({ filename: file.originalname, code: "FILE_SIZE_LIMIT", message: err.message });
      } else {
        errors.push({ filename: file.originalname, code: "UPLOAD_FAILED", message: "Unexpected error" });
      }
    }
  }

  return { files: uploaded, errors };
}
```

### 3. Controller: differentiate partial success vs total failure

```typescript
// controllers/upload.controller.ts
const result = await this.#uploadService.processUpload(files, context);

// All files failed → 400
if (result.files.length === 0 && result.errors.length > 0) {
  res.status(400).json({ data: result, error: { code: "UPLOAD_FAILED", message: "All files failed" } });
  return;
}

// At least one file succeeded → 200 (errors included in data.errors)
res.status(200).json({ data: result, error: null });
```

### 4. Response shape (types)

```typescript
interface UploadResponse {
  files: UploadedFileRecord[];  // Successfully processed
  errors: UploadFileError[];    // Per-file failures with filename, code, message
}
```

### 5. Client: map server response to per-file UI state

```typescript
// After upload completes, match server response to file queue by filename
setFiles(prev => prev.map(f => {
  const serverError = result.data?.errors.find(e => e.filename === f.name);
  if (serverError) return { ...f, status: "error", error: serverError.message };

  const serverSuccess = result.data?.files.find(s => s.filename === f.name);
  if (serverSuccess) return { ...f, status: "success", progress: 100 };

  return { ...f, status: "success", progress: 100 }; // fallback
}));
```

## Defense-in-Depth Validation

| Layer | What it validates | Why |
|-------|------------------|-----|
| multer middleware | MIME type, file size, batch count | Reject at stream level before buffering |
| Service layer | Same checks + business rules | Defense-in-depth; catches edge cases multer misses |
| Database | CHECK constraints on content_type, size_bytes | Last line of defense |
| Client | MIME type, file size before upload | Fast UX feedback |

## When to Use
- File upload endpoints that accept multiple files
- Any batch processing endpoint where individual items can fail independently
- Import endpoints (CSV rows, bulk API operations)

## When NOT to Use
- Single-item operations (just throw and let error handler respond)
- Operations where partial success is dangerous (use transactions instead)
