import { z } from "zod";

// Phone must be E.164 format e.g. +919876543210
const phoneSchema = z
  .string()
  .regex(/^\+[1-9]\d{6,14}$/, "Phone must be in E.164 format (e.g. +919876543210)");

export const sendOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp:   z.string().length(6).regex(/^\d{6}$/, "OTP must be 6 digits"),
});

export const registerSchema = z.object({
  tempToken:      z.string().min(10),
  displayName:    z.string().min(2).max(30).regex(/^[a-zA-Z0-9\s\-''\u00C0-\u024F\u0900-\u097F]+$/u, "Name contains invalid characters"),
  birthMonth:     z.number().int().min(1).max(12),
  birthYear:      z.number().int().min(1994).max(new Date().getFullYear() - 3),
  termsAccepted:  z.literal(true),
  privacyAccepted:z.literal(true),
  marketingOptIn: z.boolean().optional().default(false),
  locale:         z.string().optional().default("en"),
  timezone:       z.string().optional().default("UTC"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10),
});
