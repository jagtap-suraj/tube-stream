import { Request, Response, NextFunction } from "express";
import ApiError from "../utils/ApiError.js";
import { ZodError } from "zod";

const errorHandler = (
  err: ApiError | Error | ZodError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let errors: string[] = [];
  let stack = err.stack;
  let data = null;

  // Handle different types of errors
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
    data = err.data;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation Error";
    errors = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
  }

  if (process.env.NODE_ENV === "development") {
    // Detailed logging for development
    console.error("\n=== ERROR DETAILS ===");
    console.error(`Status Code: ${statusCode}`);
    console.error(`Message: ${message}`);
    console.error("Errors:", errors);
    console.error("\nStack Trace:");
    console.error(stack);
    console.error("\nRequest Details:");
    console.error(`${req.method} ${req.originalUrl}`);
    console.error("Body:", req.body);
    console.error("===================\n");
  } else {
    // Simple logging for production
    console.error(
      `${message} ${errors.length ? `- ${errors.join(", ")}` : ""}`
    );
  }

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    errors,
    data,
    ...(process.env.NODE_ENV === "development" && { stack }),
  });
};

export default errorHandler;