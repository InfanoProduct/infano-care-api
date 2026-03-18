import { Request, Response, NextFunction } from "express";
import { UserService } from "./user.service.js";

export class UserController {
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).userId;
      const result = await UserService.getProfile(userId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
