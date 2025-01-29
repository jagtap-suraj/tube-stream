import { User } from "../models/user.model.js";
import asyncHandler from "../utils/asyncHandler.js";
import ApiError from "../utils/ApiError.js";
import { Request, Response } from "express";
import getFile from "../utils/getFile.js";
import uploadOnCloudinary from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import { ConstantEnums } from "../constants/constantEnums.js";
import zodErrorConverter from "../utils/zodErrorConverter.js";
import {
  changePasswordSchema,
  loginUserSchema,
  registerUserSchema,
  updateUserDetailsSchema,
} from "../zodSchemas.js";
import generateTokens from "../utils/generateTokens.js";
import cookieOptions from "../constants/cookieOptions.js";
import mongoose from "mongoose";

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
export const registerUser = asyncHandler(
  async (req: Request, res: Response) => {
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
      throw new ApiError(400, "Validation Error", zodErrorConverter(error));
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
      ConstantEnums.AVATAR,
      `${req.body.username}-${ConstantEnums.AVATAR}`
    );
    if (!avatarCloudinaryPath) {
      throw new ApiError(400, "Avatar upload failed");
    }

    // Cover Image
    let coverImageCloudinaryPath = null;
    const coverImageLocalPath = getFile(req, "cover-image")?.path;
    if (coverImageLocalPath) {
      coverImageCloudinaryPath = await uploadOnCloudinary(
        coverImageLocalPath,
        req.body.username,
        ConstantEnums.COVER_IMAGE,
        `${req.body.username}-${ConstantEnums.COVER_IMAGE}`
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
  }
);

/**
 * - Schema Validation
 * - Check if user exists
 * - Check if password is correct
 * - Generate access token
 * - Generate refresh token
 * - Return res (send cookies)
 */
export const loginUser = asyncHandler(async (req: Request, res: Response) => {
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
    throw new ApiError(400, "Validation Error", zodErrorConverter(error));
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

  const { accessToken, refreshToken } = await generateTokens(user._id);

  // Again Query the database to obtain the user
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, loggedInUser, "Login Successful"));
});

export const logoutUser = asyncHandler(async (req: Request, res: Response) => {
  // Remove refresh token from the database
  await User.findByIdAndUpdate(
    req.user._id,
    { $set: { refreshToken: undefined } },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, null, "Logout Successful"));
});

export const changePassword = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.body) throw new ApiError(400, "Empty Request Body");

    const { success, error } = changePasswordSchema.safeParse(req.body);
    if (!success) {
      throw new ApiError(400, "Validation Error", zodErrorConverter(error));
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      throw new ApiError(404, "User Not Found");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(
      req.body.oldPassword
    );
    if (!isPasswordCorrect) {
      throw new ApiError(401, "Incorrect Old Password");
    }

    /**
     * You might think what kinda fool I am to directly set the password into the database
     * But I have a pre hook defined in the userSchema that hashes the password before saving it to the database
     */
    user.password = req.body.newPassword;
    await user.save({ validateBeforeSave: false });

    return res
      .status(200)
      .json(new ApiResponse(200, null, "Password Changed Successfully"));
  }
);

export const getCurrentUser = asyncHandler(
  async (req: Request, res: Response) => {
    // I can also directly return res.user but it's useful to return the entire user object
    const user = await User.findById(req.user?._id);
    return res.status(200).json(new ApiResponse(200, user));
  }
);

export const updateUserDetails = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.body) throw new ApiError(400, "Empty Request Body");

    const { success, error } = updateUserDetailsSchema.safeParse(req.body);
    if (!success) {
      throw new ApiError(400, "Validation Error", zodErrorConverter(error));
    }

    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          fullName: req.body.fullName,
          email: req.body.email,
        },
      },
      { new: true }
    ).select("-password -refreshToken");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "User Updated Sucessfully"));
  }
);

export const updateUserAvatar = asyncHandler(
  async (req: Request, res: Response) => {
    const avatarLocalPath = getFile(req, "avatar")?.path;
    if (!avatarLocalPath) {
      throw new ApiError(400, "avatar file is missing");
    }
    const avatarCloudinaryPath = await uploadOnCloudinary(
      avatarLocalPath,
      req.user?.username,
      ConstantEnums.AVATAR,
      `${req.user?.username}-${ConstantEnums.AVATAR}`
    );
    if (!avatarCloudinaryPath) {
      throw new ApiError(400, "Avatar upload failed");
    }
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          avatar: avatarCloudinaryPath.url,
        },
      },
      { new: true }
    ).select("-password -refreshToken");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Avatar Updated Sucessfully"));
  }
);

export const updateUserCoverImage = asyncHandler(
  async (req: Request, res: Response) => {
    const coverImageLocalPath = getFile(req, "cover-image")?.path;
    if (!coverImageLocalPath) {
      throw new ApiError(400, "Cover Image file is missing");
    }

    const coverImageCloudinaryPath = await uploadOnCloudinary(
      coverImageLocalPath,
      req.user?.username,
      ConstantEnums.COVER_IMAGE,
      `${req.user?.username}-${ConstantEnums.COVER_IMAGE}`
    );
    if (!coverImageCloudinaryPath) {
      throw new ApiError(400, "Cover Image upload failed");
    }
    const user = await User.findByIdAndUpdate(
      req.user?._id,
      {
        $set: {
          avatar: coverImageCloudinaryPath.url,
        },
      },
      { new: true }
    ).select("-password -refreshToken");

    return res
      .status(200)
      .json(new ApiResponse(200, user, "Cover Image Updated Sucessfully"));
  }
);

export const getUserChannelProfile = asyncHandler(
  async (req: Request, res: Response) => {
    const { username } = req.params;
    if (!username?.trim()) return new ApiError(400, "Invalid Username");

    // MongoDB Aggregation Pipeline returns an array
    const channelDetails = await User.aggregate([
      // Find the matching user
      {
        $match: {
          username: username?.toLowerCase(),
        },
      },
      // Perform lookup to find the total number of subscribers
      {
        $lookup: {
          from: "subscriptions", // keep this in lowercase & in the plular form as opposed to its name in its model file
          localField: "_id", // field of userId in the User Table
          foreignField: "channelId", // Since we need to find all the collections where _id (User) = channelId (Subscription)
          as: "subscribers", // Alias the result by the name "Subscribers"
        },
      },
      // Lookup to find the total number of subscriptions
      {
        $lookup: {
          from: "subscriptions",
          localField: "_id",
          foreignField: "subscriberId", // Find All the documents for the given user where _id (User) = userId (Subscription)
          as: "subscriptions",
        },
      },
      // Add the following fields to the User Table
      {
        $addFields: {
          subscriberCount: {
            $size: "$subscribers", // Added $ prefix to reference the array
          },
          subscriptionCount: {
            $size: "$subscribers",
          },
          // Check if our id exists in all the collections returned by the subscribers lookup.
          isSubscribed: {
            $cond: {
              // return true if current user's Id matches with any of the subscriberId
              // from the newly given lookup result subscribers
              if: { $in: [req.user?._id, "$subscribers.subscriberId"] },
              then: true,
              else: false,
            },
          },
        },
      },
      {
        $project: {
          fullName: 1, // 1 signifies that its flag is on that means it'll be included
          username: 1,
          email: 1,
          avatar: 1,
          coverImage: 1,
          subscriberCount: 1,
          subscriptionCount: 1,
          isSubscribed: 1,
          createdAt: 1,
        },
      },
    ]);

    if (!channelDetails?.length) throw new ApiError(404, "User Doesn't Exist");

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          channelDetails[0],
          "User Channel Fetched Successfully"
        )
      );
  }
);

export const getWatchHistory = asyncHandler(
  async (req: Request, res: Response) => {
    /**
     * The logic will be somehting like we have an watchHistory field in the User table
     * To populate it's data we first find the user with given userId in the User table
     * After that we perform a lookup on the Video Table to populate the content of the watchHistory field
     * of the User table.
     * But since there's a field called owner in the video table which basically referes to an user
     * so to obtain it's value we need to make another lookup to the User table
     * Making it like nested pipeline kind of a situation.
     */
    const user = await User.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(`${req.user?._id}`),
          /**
           * We didn't directly compare req.user?._id with _id
           * because in mongoDB the _ids are stored as ObjectId('679905d74f1ed6a9f9406393')
           * and when we access _id through mongoose it automatially parses it to "679905d74f1ed6a9f9406393"
           * but here an aggregation pipeline gets parsed directly by MongoDB
           * thus to convert an ObjectId to a string Id we use this method of mongoose
           * and the reason we pass`${req.user?._id}` in backticks cuz the method explcitly expects a string
           */
        },
      },
      {
        $lookup: {
          from: "videos",
          localField: "watchHistory",
          foreignField: "_id",
          as: "watchHistory",
          pipeline: [
            {
              $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                  {
                    $project: {
                      username: 1,
                      fullName: 1,
                      avatar: 1,
                    },
                  },
                ],
              },
            },
            /**
             * Following change ensures that the value of the owner field is not an array of object
             * but the first value of that array
             */
            {
              $addFields: {
                /**
                 * Obtain the first value of the owner array and replace the obtained object with the
                 * existing array-value of the owner field, making it simply an owner object
                 */
                owner: {
                  $first: "$owner",
                },
              },
            },
          ],
        },
      },
    ]);

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          user[0].watchHistory[0],
          "Watch-History Fetched Successfully"
        )
      );
  }
);
