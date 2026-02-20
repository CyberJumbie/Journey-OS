import multer from "multer";
import type { RequestHandler } from "express";
import {
  STORAGE_ALLOWED_MIME_TYPES,
  STORAGE_MAX_FILE_SIZE_BYTES,
  type StorageMimeType,
} from "@journey-os/types";
import { UnsupportedFileTypeError } from "../errors/storage.error";

const storageFileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (STORAGE_ALLOWED_MIME_TYPES.includes(file.mimetype as StorageMimeType)) {
    cb(null, true);
  } else {
    cb(new UnsupportedFileTypeError(file.mimetype, STORAGE_ALLOWED_MIME_TYPES));
  }
};

const storageUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: STORAGE_MAX_FILE_SIZE_BYTES,
  },
  fileFilter: storageFileFilter,
});

export const storageSingleFile: RequestHandler =
  storageUploadMiddleware.single("file");
