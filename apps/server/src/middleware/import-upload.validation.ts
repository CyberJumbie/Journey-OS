import multer from "multer";
import type { RequestHandler } from "express";
import { FileTypeForbiddenError } from "../errors/import-mapping.errors";

const IMPORT_ACCEPTED_MIME_TYPES = [
  "text/csv",
  "text/plain",
  "application/xml",
  "text/xml",
];

const IMPORT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const importFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (IMPORT_ACCEPTED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new FileTypeForbiddenError(file.mimetype));
  }
};

const importUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: IMPORT_MAX_FILE_SIZE_BYTES,
  },
  fileFilter: importFileFilter,
});

export const importSingleFile: RequestHandler =
  importUploadMiddleware.single("file");
