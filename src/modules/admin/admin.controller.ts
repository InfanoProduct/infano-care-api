import { Request, Response, NextFunction } from "express";
import { AdminService } from "./admin.service.js";
import { StorageService } from "../../common/utils/storage.js";

export class AdminController {
  static async getStats(req: Request, res: Response, next: NextFunction) {
    try {
      const startDateQuery = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
      const endDateQuery = req.query.endDate ? new Date(req.query.endDate as string) : undefined;
      
      if (startDateQuery) {
        startDateQuery.setUTCHours(0, 0, 0, 0);
      }
      if (endDateQuery) {
        endDateQuery.setUTCHours(23, 59, 59, 999);
      }

      const stats = await AdminService.getStats(startDateQuery, endDateQuery);
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }

  static async getMentors(_req: Request, res: Response, next: NextFunction) {
    try {
      const mentors = await AdminService.getMentors();
      res.status(200).json(mentors);
    } catch (error) {
      next(error);
    }
  }

  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const peerOnboarding = req.query.peerOnboarding === 'true' ? true : undefined;
      const role = req.query.role as string || undefined;
      const accountStatus = req.query.accountStatus as string || undefined;

      const result = await AdminService.getUsers(page, limit, peerOnboarding, role, accountStatus);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getUser(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await AdminService.getUserById(req.params.id as string);
      res.status(200).json(user);
    } catch (error) {
      next(error);
    }
  }

  static async getUserOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.getUserOverview(req.params.id as string);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async updateUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      if (!status || (status !== 'ACTIVE' && status !== 'SUSPENDED')) {
        return res.status(400).json({ message: "Invalid status. Must be ACTIVE or SUSPENDED" });
      }
      const result = await AdminService.updateUserStatus(req.params.id as string, status);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.deleteUser(req.params.id as string);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async approvePeer(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.approvePeerApplication(req.params.id as string);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async approveCertification(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.approveCertification(req.params.id as string);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async unapproveAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.unapproveAssessment(req.params.id as string);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async revokePeer(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AdminService.revokePeerStatus(req.params.id as string);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getJourneys(_req: Request, res: Response, next: NextFunction) {
    try {
      const journeys = await AdminService.getJourneys();
      res.status(200).json(journeys);
    } catch (error) {
      next(error);
    }
  }

  static async getJourney(req: Request, res: Response, next: NextFunction) {
    try {
      const journey = await AdminService.getJourneyById(req.params.id as string);
      if (!journey) return res.status(404).json({ message: "Journey not found" });
      res.status(200).json(journey);
    } catch (error) {
      next(error);
    }
  }

  static async createJourney(req: Request, res: Response, next: NextFunction) {
    try {
      const journey = await AdminService.createJourney(req.body);
      res.status(201).json(journey);
    } catch (error) {
      next(error);
    }
  }

  static async updateJourney(req: Request, res: Response, next: NextFunction) {
    try {
      const journey = await AdminService.updateJourney(req.params.id as string, req.body);
      res.status(200).json(journey);
    } catch (error) {
      next(error);
    }
  }

  static async deleteJourney(req: Request, res: Response, next: NextFunction) {
    try {
      await AdminService.deleteJourney(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async createEpisode(req: Request, res: Response, next: NextFunction) {
    try {
      const episode = await AdminService.createEpisode(req.params.journeyId as string, req.body);
      res.status(201).json(episode);
    } catch (error) {
      next(error);
    }
  }

  static async updateEpisode(req: Request, res: Response, next: NextFunction) {
    try {
      const episode = await AdminService.updateEpisode(req.params.id as string, req.body);
      res.status(200).json(episode);
    } catch (error) {
      next(error);
    }
  }

  static async deleteEpisode(req: Request, res: Response, next: NextFunction) {
    try {
      await AdminService.deleteEpisode(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async upload(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const folder = (req.query.folder as string) || '';

      // Upload to local storage (includes optimization)
      const { filename, url } = await StorageService.uploadFile(req.file.path, folder);

      res.status(200).json({
        url,
        filename,
        message: "File uploaded successfully to remote storage"
      });
    } catch (error) {
      next(error);
    }
  }

  // Order Management
  static async getOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 25;
      
      // Parse isActive query parameter robustly
      let isActive = true;
      if (req.query.isActive !== undefined) {
        const val = String(req.query.isActive).toLowerCase().trim();
        isActive = val === 'true' || val === 'active';
      }
      
      console.log(`[AdminController.getOrders] Raw query isActive:`, req.query.isActive, `-> Parsed isActive:`, isActive);

      const filters = {
        search: req.query.search as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        status: req.query.status as string,
        paymentMethod: req.query.paymentMethod as string,
        paymentStatus: req.query.paymentStatus as string,
        country: req.query.country as string,
        isActive,
        isWebinar: req.query.isWebinar === 'true',
      };
      const result = await AdminService.getOrders(page, limit, filters);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await AdminService.getOrderById(req.params.id as string);
      if (!order) return res.status(404).json({ message: "Order not found" });
      res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  }

  static async resendOrderEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await AdminService.getOrderById(req.params.id as string);
      if (!order) return res.status(404).json({ message: "Order not found" });

      if (order.items && order.items.length > 0) {
        let webinarDateStr = "TBA";
        let webinarTimeStr = "TBA";
        let webinarZoomLink = "https://zoom.us";
        let webinarTitle = "Decoding Her Silence Webinar";
        let webinarPlatform = "Zoom";

        const bookId = order.items[0].bookId;
        const { prisma } = await import("../../db/client.js");
        
        const webinar = await prisma.webinar.findUnique({
          where: { id: bookId }
        });
        
        if (webinar) {
          if (webinar.date) {
            const date = new Date(webinar.date);
            const formatterDate = new Intl.DateTimeFormat('en-US', {
              month: 'long', day: 'numeric', year: 'numeric', timeZone: 'Asia/Kolkata'
            });
            const formatterTime = new Intl.DateTimeFormat('en-US', {
              hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata'
            });
            webinarDateStr = formatterDate.format(date);
            webinarTimeStr = `${formatterTime.format(date)} (IST)`;
          }
          webinarZoomLink = webinar.zoomLink || webinar.link || webinarZoomLink;
          webinarTitle = webinar.title || webinarTitle;
          webinarPlatform = webinar.mode === 'ONLINE' ? 'Zoom (Live Online Session)' : 'Offline Session';
        }

        const emailModule = await import("../../common/services/email.service.js");
        const toEmail = order.guestEmail || (order.user as any)?.email;
        if (toEmail) {
          await emailModule.sendWebinarConfirmationEmail(toEmail, {
            parent_name: order.guestName || (order.user as any)?.username || "Parent",
            order_id: order.id.slice(-8).toUpperCase(),
            webinar_date: webinarDateStr,
            webinar_time: webinarTimeStr,
            download_pdf_url: "https://api.infano.care/uploads/assets/3_Signals_Decision_Card.pdf",
            whatsapp_group_url: "https://chat.whatsapp.com/mock-parent-community-group",
            zoom_link: webinarZoomLink,
            webinar_title: webinarTitle,
            webinar_platform: webinarPlatform
          });
        }
      }

      res.status(200).json({ success: true, message: "Email sent" });
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await AdminService.updateOrderStatus(req.params.id as string, req.body.status, req.body.awbNumber);
      res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderAwb(req: Request, res: Response, next: NextFunction) {
    try {
      const { awbNumber } = req.body;
      if (!awbNumber || typeof awbNumber !== 'string' || !awbNumber.trim()) {
        return res.status(400).json({ message: "awbNumber is required" });
      }
      const order = await AdminService.updateOrderAwb(req.params.id as string, awbNumber.trim());
      res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderActiveStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { isActive } = req.body;
      const order = await AdminService.updateOrderActiveStatus(req.params.id as string, isActive);
      res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  }

  static async addOrderComment(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await AdminService.addOrderComment(req.params.id as string, req.body.text as string);
      res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  }

  static async verifyManualPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await AdminService.verifyManualPayment(req.params.id as string, req.body.transactionId as string);
      res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  }

  static async convertToCod(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await AdminService.convertToCod(req.params.id as string);
      res.status(200).json(order);
    } catch (error) {
      next(error);
    }
  }

  // Book Management
  static async getBooks(req: Request, res: Response, next: NextFunction) {
    try {
      const isWebinar = req.query.isWebinar === 'true';
      const books = await AdminService.getBooks(isWebinar);
      res.status(200).json(books);
    } catch (error) {
      next(error);
    }
  }

  static async createBook(req: Request, res: Response, next: NextFunction) {
    try {
      const book = await AdminService.createBook(req.body);
      res.status(201).json(book);
    } catch (error) {
      next(error);
    }
  }

  static async updateBook(req: Request, res: Response, next: NextFunction) {
    try {
      const book = await AdminService.updateBook(req.params.id as string, req.body);
      res.status(200).json(book);
    } catch (error) {
      next(error);
    }
  }

  static async deleteBook(req: Request, res: Response, next: NextFunction) {
    try {
      await AdminService.deleteBook(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async getWebinars(_req: Request, res: Response, next: NextFunction) {
    try {
      const webinars = await AdminService.getWebinars();
      res.status(200).json(webinars);
    } catch (error) {
      next(error);
    }
  }

  static async getWebinar(req: Request, res: Response, next: NextFunction) {
    try {
      const webinar = await AdminService.getWebinar(req.params.id as string);
      if (!webinar) {
        return res.status(404).json({ message: "Webinar not found" });
      }
      res.status(200).json(webinar);
    } catch (error) {
      next(error);
    }
  }

  static async createWebinar(req: Request, res: Response, next: NextFunction) {
    try {
      const webinar = await AdminService.createWebinar(req.body);
      res.status(201).json(webinar);
    } catch (error) {
      next(error);
    }
  }

  static async updateWebinar(req: Request, res: Response, next: NextFunction) {
    try {
      const webinar = await AdminService.updateWebinar(req.params.id as string, req.body);
      res.status(200).json(webinar);
    } catch (error) {
      next(error);
    }
  }

  static async deleteWebinar(req: Request, res: Response, next: NextFunction) {
    try {
      await AdminService.deleteWebinar(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // Circle Management
  static async getCircles(_req: Request, res: Response, next: NextFunction) {
    try {
      const circles = await AdminService.getCircles();
      res.status(200).json(circles);
    } catch (error) {
      next(error);
    }
  }

  static async createCircle(req: Request, res: Response, next: NextFunction) {
    try {
      const circle = await AdminService.createCircle(req.body);
      res.status(201).json(circle);
    } catch (error) {
      next(error);
    }
  }

  static async updateCircle(req: Request, res: Response, next: NextFunction) {
    try {
      const circle = await AdminService.updateCircle(req.params.id as string, req.body);
      res.status(200).json(circle);
    } catch (error) {
      next(error);
    }
  }

  static async deleteCircle(req: Request, res: Response, next: NextFunction) {
    try {
      await AdminService.deleteCircle(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async getEnquiries(_req: Request, res: Response, next: NextFunction) {
    try {
      const enquiries = await AdminService.getEnquiries();
      res.status(200).json(enquiries);
    } catch (error) {
      next(error);
    }
  }

  static async getEnquiry(req: Request, res: Response, next: NextFunction) {
    try {
      const enquiry = await AdminService.getEnquiryById(req.params.id as string);
      if (!enquiry) return res.status(404).json({ message: "Enquiry not found" });
      res.status(200).json(enquiry);
    } catch (error) {
      next(error);
    }
  }

  static async listAssets(req: Request, res: Response, next: NextFunction) {
    try {
      const folderQuery = req.query.folder;
      const folder = typeof folderQuery === 'string' ? folderQuery : 'assets';
      const assets = await StorageService.listAssets(folder);
      res.status(200).json(assets);
    } catch (error) {
      next(error);
    }
  }

  static async deleteAsset(req: Request, res: Response, next: NextFunction) {
    try {
      const { filename } = req.params;
      if (!filename || typeof filename !== 'string') {
        return res.status(400).json({ message: "Filename parameter is required and must be a string" });
      }
      const folderQuery = req.query.folder;
      const folder = typeof folderQuery === 'string' ? folderQuery : 'assets';
      await StorageService.deleteAsset(filename, folder);
      res.status(200).json({ success: true, message: "Asset deleted successfully" });
    } catch (error) {
      next(error);
    }
  }

  // Expert Management
  static async getExperts(_req: Request, res: Response, next: NextFunction) {
    try {
      const experts = await AdminService.getExperts();
      res.status(200).json(experts);
    } catch (error) {
      next(error);
    }
  }

  static async createExpert(req: Request, res: Response, next: NextFunction) {
    try {
      const data = { ...req.body };
      if (req.file) {
        const { url } = await StorageService.uploadFile(req.file.path, 'experts');
        data.avatarUrl = url;
      }
      const expert = await AdminService.createExpert(data);
      res.status(201).json(expert);
    } catch (error) {
      next(error);
    }
  }

  static async updateExpert(req: Request, res: Response, next: NextFunction) {
    try {
      const data = { ...req.body };
      if (req.file) {
        const { url } = await StorageService.uploadFile(req.file.path, 'experts');
        data.avatarUrl = url;
      }
      const expert = await AdminService.updateExpert(req.params.id as string, data);
      res.status(200).json(expert);
    } catch (error) {
      next(error);
    }
  }

  static async deleteExpert(req: Request, res: Response, next: NextFunction) {
    try {
      await AdminService.deleteExpert(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // Expert Session Schedule Management
  static async getExpertSessions(_req: Request, res: Response, next: NextFunction) {
    try {
      const sessions = await AdminService.getExpertSessions();
      res.status(200).json(sessions);
    } catch (error) {
      next(error);
    }
  }

  static async updateSessionMeetLink(req: Request, res: Response, next: NextFunction) {
    try {
      const { meetLink } = req.body;
      if (!meetLink || typeof meetLink !== 'string') {
        return res.status(400).json({ message: "meetLink is required" });
      }
      const session = await AdminService.updateSessionMeetLink(req.params.id as string, meetLink);
      res.status(200).json(session);
    } catch (error) {
      next(error);
    }
  }

  static async updateSessionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      if (!status || typeof status !== 'string') {
        return res.status(400).json({ message: "status is required" });
      }
      const session = await AdminService.updateSessionStatus(req.params.id as string, status);
      res.status(200).json(session);
    } catch (error) {
      next(error);
    }
  }

  static async rescheduleSession(req: Request, res: Response, next: NextFunction) {
    try {
      const { scheduledAt } = req.body;
      if (!scheduledAt || typeof scheduledAt !== 'string') {
        return res.status(400).json({ message: "scheduledAt is required" });
      }
      const session = await AdminService.rescheduleSession(req.params.id as string, scheduledAt);
      res.status(200).json(session);
    } catch (error) {
      next(error);
    }
  }
}
