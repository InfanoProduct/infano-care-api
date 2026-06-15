import { Request, Response, NextFunction } from "express";
import { SchoolService } from "./school.service.js";
import { prisma } from "../../db/client.js";
import { AppError } from "../../common/middleware/errorHandler.js";

export class SchoolController {
  /**
   * Registers a new school and provisions coordinator credentials
   */
  static async registerSchool(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await SchoolService.registerSchool(req.body);
      res.status(201).json({
        message: "School registered successfully. Coordinator account created.",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lists all schools
   */
  static async getSchools(req: Request, res: Response, next: NextFunction) {
    try {
      const schools = await SchoolService.getSchools(req.query);
      res.status(200).json(schools);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lists all sessions across all schools for Central Calendar
   */
  static async getAllSessions(req: Request, res: Response, next: NextFunction) {
    try {
      const sessions = await SchoolService.getAllSessions(req.query);
      res.status(200).json(sessions);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets details for a specific school (with Coordinator row-level security)
   */
  static async getSchoolById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = (req as any).userId;

      // 1. Fetch user to verify authorization details and role
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, schoolId: true }
      });

      if (!user) {
        return next(new AppError("Unauthorized: User session not found.", 401));
      }

      // 2. Row-Level Data Isolation: Coordinator can only see their own school's records
      if (user.role === "SCHOOL_COORDINATOR" && user.schoolId !== id) {
        return next(new AppError("Forbidden: You are not authorized to access this school's records.", 403));
      }

      const school = await SchoolService.getSchoolById(id, user.role, userId);
      res.status(200).json(school);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Saves or updates the program configurations (MOU deliverables)
   */
  static async configureProgram(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const config = await SchoolService.configureProgram(id, req.body);
      res.status(200).json({
        message: "Program configuration saved successfully.",
        config,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Schedules a physical session
   */
  static async scheduleSession(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const session = await SchoolService.scheduleSession(id, req.body);
      res.status(201).json({
        message: "Physical session scheduled successfully.",
        session,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reschedules or updates session parameters
   */
  static async updateSession(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.sessionId as string;
      const session = await SchoolService.updateSession(sessionId, req.body);
      res.status(200).json({
        message: "Session parameters updated successfully.",
        session,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Completes a session and enters actual execution metrics
   */
  static async completeSession(req: Request, res: Response, next: NextFunction) {
    try {
      const sessionId = req.params.sessionId as string;
      const session = await SchoolService.completeSession(sessionId, req.body);
      res.status(200).json({
        message: "Session successfully completed. Metrics captured.",
        session,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk imports students using list payloads
   */
  static async importStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { students } = req.body;
      const result = await SchoolService.importStudents(id, students);
      res.status(200).json({
        message: "Students bulk imported successfully.",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Gets aggregated wellness insights for a specific school (DPDP compliant)
   */
  static async getWellnessInsights(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const userId = (req as any).userId;

      // 1. Fetch user to verify authorization details and role
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, schoolId: true }
      });

      if (!user) {
        return next(new AppError("Unauthorized: User session not found.", 401));
      }

      // 2. Row-Level Data Isolation: Coordinator can only see their own school's records
      if (user.role === "SCHOOL_COORDINATOR" && user.schoolId !== id) {
        return next(new AppError("Forbidden: You are not authorized to access this school's records.", 403));
      }

      const insights = await SchoolService.getWellnessInsights(id);
      res.status(200).json(insights);
    } catch (error) {
      next(error);
    }
  }
}
