import { Request, Response, NextFunction } from "express";
import { AdminService } from "./admin.service.js";
import { RemoteStorageService } from "../../common/utils/remoteStorage.js";

export class AdminController {
  static async getStats(_req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await AdminService.getStats();
      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }

  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const result = await AdminService.getUsers(page, limit);
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
      
      // Upload to remote storage (includes optimization)
      const { filename, url } = await RemoteStorageService.uploadFile(req.file.path, folder);

      res.status(200).json({ 
        url,
        filename,
        message: "File uploaded successfully to remote storage"
      });
    } catch (error) {
      next(error);
    }
  }
}
