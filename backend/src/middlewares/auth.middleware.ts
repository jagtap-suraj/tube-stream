import asyncHandler from "../utils/asyncHandler.js";
import e, { Request, Response, NextFunction } from "express";
import ApiError from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import config from "../config/index.js";
import { User } from "../models/user.model.js";

/**
 * Verifies if the user exists or not.
 */

const verifyJWT = asyncHandler(async (req: Request, _, next: NextFunction) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "Unauthorized");
    }

    const decodedToken = jwt.verify(token, config.jwt.secret);
    if (!decodedToken) {
      throw new ApiError(401, "Unauthorized");
    }
    console.log(decodedToken);
    const id = JSON.parse(JSON.stringify(decodedToken))._id;
    console.log(id);

    const user = await User.findById(id).select("-password -refreshToken");

    if (!user) {
      throw new ApiError(401, "Unauthorized");
    }

    req.user = user;
    next();
  } catch (error: any) {
    throw new ApiError(401, error?.message);
  }
});

export default verifyJWT;
