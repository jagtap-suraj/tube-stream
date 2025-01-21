import { User } from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { z } from "zod";
import { Request, Response } from "express";
import getFile from "../utils/getFile.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import { ConstantEnums } from "../constants/constantEnums.js";

const registerUserSchema = z.object({
  fullName: z.string().min(3, "Name is too short"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must contain atleast 8 characters"),
  username: z
    .string()
    .min(3, "Username is too short")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Username can only contain letters, numbers, underscores, and hyphens"
    ),
});

/**
 * - Add Multer middleware in the user route
 * - Get User Details from frontend.
 * - Schema Validation using zod (including avatar)
 * - Check if user already exists
 * - Upload the images on cloudinary
 * - create user object with obtained cloudinary urls - create a db entry
 * - remove password and refresh token field from response
 * - check for user creation
 * - return res
 */
const registerUser = asyncHandler(async (req: Request, res: Response) => {
  // If the body is empty
  if (!req.body) throw new ApiError(400, "Empty Request Body");

  // Trim the fields to remove unwanted spaces
  req.body.fullName = req.body.fullName?.trim();
  req.body.email = req.body.email?.trim();
  req.body.username = req.body.username?.trim();
  req.body.password = req.body.password?.trim();

  // Schema Validation
  const { success, error } = registerUserSchema.safeParse(req.body);
  if (!success) {
    throw new ApiError(
      400,
      "Validation Error",
      error.errors.map((e) => e.message)
    );
  }

  // Check if user already exists
  const existingUser = await User.findOne({
    $or: [
      { username: req.body.username?.trim() },
      { email: req.body.email?.trim() },
    ],
  });
  if (existingUser) {
    throw new ApiError(409, "User Already Exists");
  }

  // Avatar Validation and Upload
  const avatarLocalPath = getFile(req, "avatar")?.path;
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar is required");
  }
  const avatarCloudinaryPath = await uploadOnCloudinary(
    avatarLocalPath,
    req.body.username,
    ConstantEnums.AVATAR
  );
  if (!avatarCloudinaryPath) {
    throw new ApiError(400, "Avatar upload failed");
  }

  // Cover Image
  let coverImageCloudinaryPath = null;
  const coverImageLocalPath = getFile(req, "coverImage")?.path;
  if (coverImageLocalPath) {
    coverImageCloudinaryPath = await uploadOnCloudinary(
      coverImageLocalPath,
      req.body.username,
      ConstantEnums.COVER_IMAGE
    );
    if (!coverImageCloudinaryPath) {
      throw new ApiError(400, "Cover Image upload failed");
    }
  }

  // Create User
  const user = await User.create({
    fullName: req.body.fullName,
    email: req.body.email,
    username: req.body.username,
    password: req.body.password,
    avatar: avatarCloudinaryPath.url,
    coverImage: coverImageCloudinaryPath?.url || null,
  });

  // Check if the user is created, if it is remove the password and refresh token field
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  if (!createdUser) {
    throw new ApiError(500, "User creation failed");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User Created Successfully"));
});

export { registerUser };
