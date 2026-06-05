import { z } from "zod";

// Phone must be E.164 format with supported country codes
const phoneSchema = z
  .string()
  .regex(/^\+(91\d{10}|1\d{10}|44\d{10,11}|65\d{8}|971\d{9}|61\d{9})$/, "Phone must be in a valid format with country code");

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

export const adminLoginSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
});
