import multer from "multer";
import type { RequestHandler } from "express";
import {
  ACCEPTED_MIME_TYPES,
  UPLOAD_MAX_FILE_SIZE_BYTES,
  UPLOAD_MAX_FILES_PER_BATCH,
  type AcceptedMimeType,
} from "@journey-os/types";
import { InvalidFileTypeError } from "../errors/upload.error";

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (ACCEPTED_MIME_TYPES.includes(file.mimetype as AcceptedMimeType)) {
    cb(null, true);
  } else {
    cb(
      new InvalidFileTypeError(
        file.originalname,
        file.mimetype,
        ACCEPTED_MIME_TYPES,
      ),
    );
  }
};

export const uploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: UPLOAD_MAX_FILE_SIZE_BYTES,
    files: UPLOAD_MAX_FILES_PER_BATCH,
  },
  fileFilter,
});

export const uploadFiles: RequestHandler = uploadMiddleware.array(
  "files",
  UPLOAD_MAX_FILES_PER_BATCH,
);
