import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must contain at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(
    /[^A-Za-z0-9]/,
    "Password must contain at least one special character"
  );

export const userNameSchema = z
  .string()
  .min(3, "Username is too short")
  .max(30, "Username is too long")
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    "Username can only contain letters, numbers, underscores, and hyphens"
  );

export const fullNameSchema = z
  .string()
  .min(3, "Name is too short")
  .regex(/^[a-zA-Z\s]+$/, "Name can only contain letters and spaces");

export const registerUserSchema = z.object({
  fullName: fullNameSchema,

  email: z.string().email("Invalid email address"),

  password: passwordSchema,

  username: userNameSchema,
});

export const loginUserSchema = z
  .object({
    email: z.string().email("Invalid email address").optional(),
    username: userNameSchema.optional(),
    password: passwordSchema,
  })
  .refine((data) => data.email || data.username, {
    message: "Either email or username is required",
  });

export const changePasswordSchema = z.object({
  oldPassword: passwordSchema,
  newPassword: passwordSchema,
});

export const updateUserDetailsSchema = z
  .object({
    email: z.string().email("Invalid email address").optional(),
    fullName: fullNameSchema.optional(),
  })
  .refine((data) => data.email || data.fullName, {
    message: "Either email or name is required",
  });
