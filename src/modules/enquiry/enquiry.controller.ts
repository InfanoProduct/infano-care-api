import { Request, Response, NextFunction } from "express";
import { prisma } from "../../db/client.js";
import { z } from "zod";

const enquirySchema = z.object({
  type: z.string().default("school"),
  schoolName: z.string().optional(),
  schoolType: z.string().optional(),
  cityState: z.string().optional(),
  totalGirls: z.number().optional(),
  studentCount: z.number().int().positive().optional(),
  board: z.enum(["CBSE", "ICSE", "State board", "IB / Cambridge", "Other"]).optional(),
  contactName: z.string().optional(),
  contactRole: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  preferredTime: z.string().optional(),
  preferredWeek: z.enum(["Next week", "In 2 weeks", "Later this month"]).optional(),
  wantsDemo: z.boolean().optional(),
  goals: z.string().optional(),
  details: z.string().optional(),
  ngoDetail: z.string().optional(),
  peerMentorName: z.string().optional(),
  preferredDate: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.type !== "school_health_check") return;

  const requiredFields: Array<[keyof typeof data, string]> = [
    ["schoolName", "School name is required"],
    ["cityState", "City is required"],
    ["studentCount", "Student count must be a positive whole number"],
    ["board", "Board is required"],
    ["contactName", "Contact name is required"],
    ["contactRole", "Contact role is required"],
    ["phone", "Phone number is required"],
    ["preferredWeek", "Preferred week is required"],
    ["wantsDemo", "Demo preference is required"],
  ];

  for (const [field, message] of requiredFields) {
    const value = data[field];
    if (value === undefined || value === null || (typeof value === "string" && !value.trim())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [field], message });
    }
  }
});

const newsletterSchema = z.object({
  name: z.string().optional(),
  email: z.string().email("Invalid email address"),
  role: z.string().optional(),
});

export class EnquiryController {
  static async submitEnquiry(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = enquirySchema.parse(req.body);

      const enquiry = await prisma.enquiry.create({
        data: {
          ...validatedData,
          schoolName: validatedData.schoolName || "",
          email: validatedData.email || null,
        },
      });

      res.status(201).json({
        message: "Enquiry submitted successfully",
        enquiry,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0]?.message ?? "Invalid enquiry details", errors: error.errors });
      }
      next(error);
    }
  }

  static async subscribeNewsletter(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = newsletterSchema.parse(req.body);

      const subscription = await prisma.newsletterSubscription.upsert({
        where: { email: validatedData.email },
        update: validatedData,
        create: validatedData,
      });

      res.status(201).json({
        message: "Subscribed successfully",
        subscription,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      next(error);
    }
  }
}
