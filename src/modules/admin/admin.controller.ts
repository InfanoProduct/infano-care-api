import { Request, Response, NextFunction } from "express";
import { AdminService } from "./admin.service.js";
import { StorageService } from "../../common/utils/storage.js";

export class AdminController {
  static async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AdminService.getStats();
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
      const result = await AdminService.getUsers(page, limit, peerOnboarding);
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
      const filters = {
        search: req.query.search as string,
        dateFrom: req.query.dateFrom as string,
        dateTo: req.query.dateTo as string,
        status: req.query.status as string,
        paymentMethod: req.query.paymentMethod as string,
        paymentStatus: req.query.paymentStatus as string,
        isActive: req.query.isActive !== undefined ? req.query.isActive === 'true' : true,
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

  static async updateOrderStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await AdminService.updateOrderStatus(req.params.id as string, req.body.status);
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
  static async getBooks(_req: Request, res: Response, next: NextFunction) {
    try {
      const books = await AdminService.getBooks();
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
