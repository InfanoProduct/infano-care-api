import { Request, Response, NextFunction } from "express";
import { ShopService } from "./shop.service.js";

export class ShopController {
  static async getBooks(_req: Request, res: Response, next: NextFunction) {
    try {
      const books = await ShopService.getBooks();
      res.status(200).json(books);
    } catch (error) {
      next(error);
    }
  }

  static async getBook(req: Request, res: Response, next: NextFunction) {
    try {
      const book = await ShopService.getBook(req.params.id);
      if (!book) return res.status(404).json({ message: "Book not found" });
      res.status(200).json(book);
    } catch (error) {
      next(error);
    }
  }

  static async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await ShopService.createOrder(req.body);
      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  }

  static async verifyPayment(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ShopService.verifyPayment(req.body);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers["x-razorpay-signature"] as string;
      const result = await ShopService.handleWebhook(JSON.stringify(req.body), signature);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
