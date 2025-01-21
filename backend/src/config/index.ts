// 1. Import dependencies
import dotenv from "dotenv";
import { validateEnv } from "./validateEnv.js";

// 2. Handle different environment configurations
const envFile = process.env.NODE_ENV ? `.env.${process.env.NODE_ENV}` : ".env";
// This means:
// - If NODE_ENV=production, it loads .env.production
// - If NODE_ENV=development, it loads .env.development
// - If NODE_ENV is not set, it loads .env

// 3. Load environment variables from the appropriate .env file
dotenv.config({
  path: envFile,
});
// 4. Validate required environment variables
validateEnv(); // This will throw error if required env vars are missing

// 5. Create and export the configuration object
export const config = {
  // Current environment (development/production/test)
  env: process.env.NODE_ENV || "development",

  // Server port number
  port: process.env.PORT || 8000,

  // MongoDB connection settings
  mongodb: {
    uri: process.env.MONGODB_URI,
  },

  // Cloudinary configuration
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  // JWT configuration with defaults
  jwt: {
    secret: process.env.TOKEN_SECRET || "secret",
    accessTokenExpiry: process.env.ACCESS_TOKEN_EXPIRY || "1d",
    refreshTokenExpiry: process.env.REFRESH_TOKEN_EXPIRY || "10d",
  },
} as const; // 'as const' makes the object immutable

// 6. Default export for easier importing
export default config;
