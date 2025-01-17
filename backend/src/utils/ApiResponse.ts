class ApiResponse {
  statusCode: number;
  data?: any;
  success: boolean;
  message: string;
  constructor(statusCode: number, data?: any, message = "Success") {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400; // set success to true if status code is less than 400
  }
}

export default ApiResponse;
