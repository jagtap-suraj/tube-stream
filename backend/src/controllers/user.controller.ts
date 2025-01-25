import { User } from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { z } from "zod";
import { Request, Response } from "express";
import getFile from "../utils/getFile.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import { ConstantEnums } from "../constants/constantEnums.js";

const generateAccessAndRefreshToken = async (userId: string) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, "User not found");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Token generation failed");
  }
};

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
      error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
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

const loginUserSchema = z
  .object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must contain atleast 8 characters"),
  })
  .or(
    z.object({
      username: z.string(),
      password: z.string().min(8, "Password must contain atleast 8 characters"),
    })
  );

/**
 * - Schema Validation
 * - Check if user exists
 * - Check if password is correct
 * - Generate access token
 * - Generate refresh token
 * - Return res (send cookies)
 */
const loginUser = asyncHandler(async (req: Request, res: Response) => {
  // If the body is empty
  if (!req.body) throw new ApiError(400, "Empty Request Body");

  // If username or email is not provided
  if (!req.body.email && !req.body.username) {
    throw new ApiError(400, "Email or Username is required");
  }

  // Trim the fields to remove unwanted spaces
  req.body.email = req.body.email?.trim();
  req.body.username = req.body.username?.trim();
  req.body.password = req.body.password?.trim();

  // Schema Validation
  const { success, error } = loginUserSchema.safeParse(req.body);
  if (!success) {
    throw new ApiError(
      400,
      "Validation Error",
      error.errors.map((e) => `${e.path.join(".")}: ${e.message}`)
    );
  }

  // Check if user exists
  const user = await User.findOne({
    $or: [{ email: req.body.email }, { username: req.body.username }],
  });
  if (!user) {
    throw new ApiError(401, "User Not Found");
  }

  // Check if password is correct
  // we haven't use User. to access methods as we use to access mongoose methods
  // and custom written methods are access with user (small case user object)
  const isPasswordCorrect = await user.isPasswordCorrect(req.body.password);
  if (!isPasswordCorrect) {
    throw new ApiError(401, "Incorrect Password");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id
  );

  // Again Query the database to obtain the user
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  // Send Cookied
  const options = {
    httpOnly: true, // cookie cannot be accessed by JavaScript running in the browser
    secure: process.env.NODE_ENV === "production", // cookie will only be sent over HTTPS
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, loggedInUser, "Login Successful"));
});

const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  // Remove refresh token from the database
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined } },
    {
      new: true,
    }
  );

  // clear cookied
  const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, null, "Logout Successful"));
});

export { registerUser, loginUser, logoutUser };
