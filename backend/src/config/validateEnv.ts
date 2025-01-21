// src/config/validateEnv.ts
export const validateEnv = () => {
  const requiredEnvVars = [
    "PORT",
    "MONGODB_URI",
    "CORS_ORIGIN",
    "TOKEN_SECRET",
    "ACCESS_TOKEN_EXPIRY",
    "REFRESH_TOKEN_EXPIRY",
    "CLOUDINARY_CLOUD_NAME",
    "CLOUDINARY_API_KEY",
    "CLOUDINARY_API_SECRET",
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    throw new Error(
      `Missing required environment variables:\n${missingEnvVars.join("\n")}`
    );
  }
};
