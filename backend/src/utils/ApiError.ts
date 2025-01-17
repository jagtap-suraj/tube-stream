class ApiError extends Error {
  statusCode: number;
  data?: any;
  success: boolean;
  errors: string[];

  constructor(
    statusCode: number = 500,
    message: string = "Something went wrong",
    errors: string[] = [],
    data?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = data || null;
    this.success = false;
    this.errors = errors;

    // Capture the stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}
