import multer, { FileFilterCallback } from "multer";
import ApiError from "../utils/ApiError.js";
import mime from "mime-types";
import { NextFunction, Request, Response } from "express";

/**
 * Storage configuration for uploaded files
 * Files are temporarily stored in './public/temp' with their original names
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "./public/temp"),
  filename: (_req, file, cb) => cb(null, file.originalname),
});

/**
 * File type validator
 * Only allows jpeg, png, jpg, and webp image formats
 */
const fileFilter = (
  _req: Request, // Request object (unused, hence _)
  file: Express.Multer.File, // Contains info about uploaded file
  cb: FileFilterCallback // Callback function to accept/reject file
) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/jpg",
    "image/webp",
  ];

  // Check file's type by looking at its extension
  const mimeType = mime.lookup(file.originalname);

  // If invalid file type:
  if (!mimeType || !allowedMimeTypes.includes(mimeType)) {
    // Call callback with error
    return cb(new ApiError(400, "Invalid file type..."));
  }

  // If valid file type:
  // Call callback with (null = no error, true = accept file)
  cb(null, true);
};

// Main multer configuration
const multerUpload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter,
}).fields([
  { name: "avatar", maxCount: 1 },
  { name: "cover-image", maxCount: 1 },
]);

/**
 * Unified error handling middleware for file uploads
 * Converts all multer errors into ApiError format
 */
const upload = (req: Request, res: Response<any>, next: NextFunction) => {
  multerUpload(req, res, (err) =>
    err ? next(new ApiError(400, err.message)) : next()
  );
};

export default upload;
