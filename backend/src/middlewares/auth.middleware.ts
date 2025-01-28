import asyncHandler from "../utils/asyncHandler.js";
import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
import config from "../config/index.js";
import { User } from "../models/user.model.js";

/**
 * Middleware to verify JWT access token.
 * - If valid, attaches the user to the request and proceeds.
 * - If expired, verifies the refresh token and generates a new access token.
 * - If both tokens are invalid, forces the user to reauthenticate.
 * 
 * ### **Final Behavior in Production**
| **Scenario** | **Action Taken** |
|-------------|----------------|
| Access token is valid | Request proceeds |
| Access token is expired, but refresh token is valid | New access token is issued |
| Access token is expired, refresh token is expired | Both tokens are cleared, user must log in again |
| Access token is expired, refresh token is invalid | Refresh token is cleared, user must log in again |
| No access token provided | Unauthorized (401) |
 */
const verifyJWT = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Extract access token from cookies or Authorization header
      let accessToken =
        req.cookies?.accessToken ||
        req.header("Authorization")?.replace("Bearer ", "");
      const refreshToken = req.cookies?.refreshToken;

      if (!accessToken) {
        throw new ApiError(401, "Unauthorized - No Access Token");
      }

      try {
        // Verify access token
        const decodedToken = jwt.verify(accessToken, config.jwt.secret);
        const user = await User.findById((decodedToken as any)._id).select(
          "-password -refreshToken"
        );

        if (!user) {
          throw new ApiError(401, "Unauthorized - User Not Found");
        }

        req.user = user;
        return next();
      } catch (error: any) {
        // Handle expired access token
        if (error.name === "TokenExpiredError") {
          if (!refreshToken) {
            throw new ApiError(401, "Unauthorized - No Refresh Token");
          }

          try {
            // Verify refresh token
            const decodedRefreshToken = jwt.verify(
              refreshToken,
              config.jwt.secret
            );
            const user = await User.findById((decodedRefreshToken as any)._id);

            if (!user || user.refreshToken !== refreshToken) {
              res.clearCookie("refreshToken"); // Clear refresh token if it's invalid
              throw new ApiError(401, "Unauthorized - Invalid Refresh Token");
            }

            // Generate new access token
            const newAccessToken = user.generateAccessToken();
            res.cookie("accessToken", newAccessToken, {
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
            });

            req.user = User.findById(user._id).select(
              "-password -refreshToken"
            );
            return next();
          } catch (error: any) {
            if (error.name === "TokenExpiredError") {
              res.clearCookie("refreshToken"); // Clear refresh token if it's expired
              res.clearCookie("accessToken");
              throw new ApiError(403, "Session expired. Please log in again.");
            }
            throw new ApiError(401, "Unauthorized - Invalid Refresh Token");
          }
        }
        throw new ApiError(401, "Unauthorized - Invalid Token");
      }
    } catch (error: any) {
      throw new ApiError(401, error?.message || "Unauthorized");
    }
  }
);

export default verifyJWT;
