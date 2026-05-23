import { Request, Response, NextFunction } from "express";
import { prisma } from "../../db/client.js";
import { z } from "zod";
import { emailService } from "../../common/services/email.service.js";

const enquirySchema = z.object({
  type: z.string().default("school"),
  schoolName: z.string().optional(),
  schoolType: z.string().optional(),
  cityState: z.string().optional(),
  totalGirls: z.number().optional(),
  contactName: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  preferredTime: z.string().optional(),
  goals: z.string().optional(),
  details: z.string().optional(),
  ngoDetail: z.string().optional(),
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
        data: validatedData,
      });

      if (enquiry.email) {
        // Send email in the background so it doesn't block the response
        emailService.sendEnquiryConfirmation(enquiry.email, enquiry.contactName || undefined).catch(console.error);
      }

      res.status(201).json({
        message: "Enquiry submitted successfully",
        enquiry,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
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

      // Send welcome email in background
      emailService.sendNewsletterWelcome(subscription.email, subscription.name || undefined).catch(console.error);

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
