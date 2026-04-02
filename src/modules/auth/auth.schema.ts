import { z } from "zod";

// Phone must be E.164 format e.g. +919876543210
const phoneSchema = z
  .string()
  .regex(/^\+91\d{10}$/, "Phone must be in +91XXXXXXXXXX format");

export const sendOtpSchema = z.object({
  phone:    phoneSchema,
  appHash:  z.string().optional(),
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp:   z.string().length(4).regex(/^\d{4}$/, "OTP must be 4 digits"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
