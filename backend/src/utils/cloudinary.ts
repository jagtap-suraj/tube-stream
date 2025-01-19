/**
 * 1. Obtain the file from the user's local system (using file input or other methods).
 * 2. Upload the file to the server temporarily using Multer.
 * 3. Retrieve the file path of the uploaded file from the server.
 * 4. Upload the file to Cloudinary for storage and remove it from the server.
 */

import { v2 as cloudinary } from "cloudinary";
import fs from "fs"; // Node File System helps with managing files and directories

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath: string) => {
  try {
    if (!localFilePath) return null;
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    console.log("file is uploaded on cloudinary ", response.url);
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    // remove the locally saved temporary file as the upload operation got failed
    fs.unlinkSync(localFilePath);
    return null;
  }
};

export default uploadOnCloudinary;
