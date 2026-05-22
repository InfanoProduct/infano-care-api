import { Request, Response, NextFunction } from "express";
import { ProgramsService } from "./programs.service.js";

export class ProgramsController {
  // --- User-Facing Controller Methods ---

  static async list(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user?.id; // Optional authentication
      const programs = await ProgramsService.listActive(userId);
      res.status(200).json({ success: true, data: programs });
    } catch (error) {
      next(error);
    }
  }

  static async get(req: Request, res: Response, next: NextFunction) {
    try {
      const program = await ProgramsService.getById(req.params.id as string);
      res.status(200).json({ success: true, data: program });
    } catch (error) {
      next(error);
    }
  }

  static async enroll(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const programId = req.params.id;
      const { type } = req.body; // "PRIVATE" | "GROUP"
      
      if (!type || (type !== "PRIVATE" && type !== "GROUP")) {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid enrollment type. Must be 'PRIVATE' or 'GROUP'." 
        });
      }

      const result = await ProgramsService.enrollUser(userId, programId, type);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async me(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const enrollments = await ProgramsService.getUserEnrollments(userId);
      res.status(200).json({ success: true, data: enrollments });
    } catch (error) {
      next(error);
    }
  }

  // --- Admin-Facing Controller Methods ---

  static async adminList(_req: Request, res: Response, next: NextFunction) {
    try {
      const programs = await ProgramsService.adminList();
      res.status(200).json(programs);
    } catch (error) {
      next(error);
    }
  }

  static async adminCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const program = await ProgramsService.adminCreate(req.body);
      res.status(201).json(program);
    } catch (error) {
      next(error);
    }
  }

  static async adminUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const program = await ProgramsService.adminUpdate(req.params.id as string, req.body);
      res.status(200).json(program);
    } catch (error) {
      next(error);
    }
  }

  static async adminDelete(req: Request, res: Response, next: NextFunction) {
    try {
      await ProgramsService.adminDelete(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async adminListEnrollments(_req: Request, res: Response, next: NextFunction) {
    try {
      const enrollments = await ProgramsService.adminListEnrollments();
      res.status(200).json(enrollments);
    } catch (error) {
      next(error);
    }
  }

  static async adminUpdateEnrollmentStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      const enrollment = await ProgramsService.adminUpdateEnrollmentStatus(req.params.id as string, status);
      res.status(200).json(enrollment);
    } catch (error) {
      next(error);
    }
  }

  static async bookDemo(req: Request, res: Response, next: NextFunction) {
    try {
      const demo = await ProgramsService.bookDemoSession(req.body);
      res.status(201).json({ success: true, data: demo });
    } catch (error) {
      next(error);
    }
  }

  static async adminListDemos(_req: Request, res: Response, next: NextFunction) {
    try {
      const demos = await ProgramsService.adminListDemos();
      res.status(200).json(demos);
    } catch (error) {
      next(error);
    }
  }

  static async adminUpdateDemoStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: "Status is required" });
      }
      const demo = await ProgramsService.adminUpdateDemoStatus(req.params.id as string, status);
      res.status(200).json(demo);
    } catch (error) {
      next(error);
    }
  }
}
