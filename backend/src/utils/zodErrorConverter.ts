import { z } from "zod";

/**
 * Converts a Zod validation error into a human-readable string format.
 *
 * This function takes a ZodError object, which is returned when Zod validation fails,
 * and converts it into an array of error messages. Each message contains the path to the
 * invalid field (e.g., "fullName") and the corresponding error message (e.g., "Name is too short").
 *
 * Example:
 *
 * Input:
 *   {
 *     errors: [
 *       { path: ["fullName"], message: "Name is too short" },
 *       { path: ["address", "street"], message: "Street name is requireds" }
 *     ]
 *   }
 *
 * Output:
 *   ["fullName: Name is too short", "address.street: Street name is required"]
 *
 * @param error - The ZodError object containing validation errors.
 * @returns An array of formatted error messages.
 */
const zodErrorConverter = (error: z.ZodError<any>): string[] => {
  return error.errors.map((e) => `${e.path.join(".")}: ${e.message}`);
};

export default zodErrorConverter;
