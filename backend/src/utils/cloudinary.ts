/**
 * 1. Obtain the file from the user's local system (using file input or other methods).
 * 2. Upload the file to the server temporarily using Multer.
 * 3. Retrieve the file path of the uploaded file from the server.
 * 4. Upload the file to Cloudinary for storage and remove it from the server.
 */

import { v2 as cloudinary } from "cloudinary";
import { ConstantEnums } from "../constants/constantEnums.js";
import fs from "fs"; // Node File System helps with managing files and directories
import config from "../config/index.js";


cloudinary.config(
  {
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret,
  },
);

const uploadOnCloudinary = async (
  localFilePath: string,
  username: string,
  contentType: ConstantEnums
) => {
  try {
    if (!localFilePath) return null;
    //upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      folder: `${ConstantEnums.TUBESTREAM}/${ConstantEnums.USERS}/${username}/${contentType}`,
      resource_type: "auto",
    });
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (error) {
    console.error("Cloudinary Upload Error:", error);
    // remove the locally saved temporary file as the upload operation got failed
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return null;
  }
};

export default uploadOnCloudinary;
