import { Request, Response } from "express";
import { ParentService } from "./parent.service.js";
import { z } from "zod";

const inviteSchema = z.object({
  phone: z.string().min(10).max(15)
});

export class ParentController {
  static async invite(req: Request, res: Response) {
    try {
      const { phone } = inviteSchema.parse(req.body);
      const userId = (req as any).userId;
      
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const link = await ParentService.invite(userId, phone);
      res.status(201).json(link);
    } catch (error: any) {
      if (error.message === "USER_NOT_FOUND") {
        return res.status(404).json({ error: "User not found. Please create an account on the app first." });
      }
      res.status(400).json({ error: error.message || "Failed to send invite" });
    }
  }

  static async getLinks(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const links = await ParentService.getLinks(userId);
      res.json(links);
    } catch (error: any) {
      console.error("[getLinks ERROR]:", error);
      res.status(400).json({ error: error.message || "Failed to get links" });
    }
  }

  static async cancelInvite(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      await ParentService.cancelInvite(userId, id as string);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to cancel invite" });
    }
  }

  static async acceptInvite(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;

      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const link = await ParentService.acceptInvite(userId, id as string);
      res.json(link);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to accept invite" });
    }
  }

  static async getDashboardSummary(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const summary = await ParentService.getDashboardSummary(userId);
      res.json(summary);
    } catch (error: any) {
      res.status(400).json({ error: "Failed to get dashboard summary" });
    }
  }

  // --- Expert Booking Methods ---

  static async getExperts(req: Request, res: Response) {
    try {
      const specialisation = req.query.specialisation as string | undefined;
      const experts = await ParentService.getExperts(specialisation);
      res.json(experts);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to fetch experts" });
    }
  }

  static async bookExpertSession(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { expertId, scheduledAt } = req.body;
      const order = await ParentService.bookExpertSession(userId, expertId, scheduledAt);
      res.status(201).json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to initiate booking" });
    }
  }

  static async verifyExpertSessionPayment(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { razorpayOrderId, razorpayPaymentId, razorpaySignature, expertId, scheduledAt } = req.body;
      const schedule = await ParentService.verifyExpertSessionPayment(userId, {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        expertId,
        scheduledAt: new Date(scheduledAt)
      });
      res.json(schedule);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to verify payment" });
    }
  }

  static async getExpertSessions(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const sessions = await ParentService.getExpertSessions(userId);
      res.json(sessions);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to fetch expert sessions" });
    }
  }

  static async cancelExpertSession(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const session = await ParentService.cancelExpertSession(userId, req.params.id as string);
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to cancel session" });
    }
  }

  static async getExpertSlots(req: Request, res: Response) {
    try {
      const expertId = req.params.id as string;
      const slots = await ParentService.getExpertSlots(expertId);
      res.json(slots);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to get expert slots" });
    }
  }

  static async rescheduleExpertSession(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const { newScheduledAt } = req.body;
      const session = await ParentService.rescheduleExpertSession(userId, req.params.id as string, new Date(newScheduledAt));
      res.json(session);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to reschedule session" });
    }
  }

  // --- Resource Library & Bookmark Methods ---

  static async getResources(req: Request, res: Response) {
    try {
      const categoryId = req.query.category as string | undefined;
      const resources = await ParentService.getResources(categoryId);
      res.json(resources);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to fetch resources" });
    }
  }

  static async bookmarkResource(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const postId = req.params.id as string;
      const bookmark = await ParentService.bookmarkResource(userId, postId);
      res.status(201).json(bookmark);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to bookmark resource" });
    }
  }

  static async unbookmarkResource(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const postId = req.params.id as string;
      await ParentService.unbookmarkResource(userId, postId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to unbookmark resource" });
    }
  }

  static async getBookmarks(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const bookmarks = await ParentService.getBookmarks(userId);
      res.json(bookmarks);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to fetch bookmarks" });
    }
  }

  static async getTeenParentBookmarks(req: Request, res: Response) {
    try {
      const teenId = (req as any).userId;
      if (!teenId) return res.status(401).json({ error: "Unauthorized" });

      const bookmarks = await ParentService.getTeenParentBookmarks(teenId);
      res.json(bookmarks);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to fetch parent bookmarks" });
    }
  }

  static async getNotifications(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      const notifications = await ParentService.getNotifications(userId);
      res.json(notifications);
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to fetch notifications" });
    }
  }

  static async dismissNotification(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const { id } = req.params;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      await ParentService.dismissNotification(userId, id as string);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to dismiss notification" });
    }
  }

  static async clearAllNotifications(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });

      await ParentService.clearAllNotifications(userId);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Failed to clear all notifications" });
    }
  }
}
