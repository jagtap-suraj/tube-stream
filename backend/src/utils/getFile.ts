import { Request } from "express";

/**
 * Retrieves the first uploaded file for a specified field name from the request object.
 *
 * - Multer adds the `files` property to the `req` object, which can have multiple possible types:
 *   1. An object where keys are field names, and values are arrays of files (used with `upload.fields()`).
 *   2. An array of files (used with `upload.array()`).
 *   3. A single file object (used with `upload.single()`).
 * - TypeScript cannot automatically infer which structure applies because `req.files` has a union type.
 *
 * ### What does this function do?
 * - It explicitly casts `req.files` to the expected structure (`{ [key: string]: Express.Multer.File[] } | undefined`)
 *   used when `upload.fields()` middleware is employed.
 * - It safely accesses the array of files for the specified `fieldName` and returns the first file (`[0]`).
 * - If no files are found for the given field name, it returns `undefined`.
 *
 */

const getFile = (req: Request, fieldName: string) => {
  const files = req.files as
    | { [key: string]: Express.Multer.File[] }
    | undefined;
  return files?.[fieldName]?.[0];
};

export default getFile;
