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
      const book = await ShopService.getBook(req.params.id as string);
      if (!book) return res.status(404).json({ message: "Book not found" });
      res.status(200).json(book);
    } catch (error) {
      next(error);
    }
  }

  static async validateCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, amount } = req.body;
      const result = await ShopService.validateCoupon(code, amount);
      res.status(200).json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
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
      if (!signature) {
        return res.status(400).json({ message: "Missing Razorpay signature" });
      }
      const result = await ShopService.handleWebhook(JSON.stringify(req.body), signature);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async adminListCoupons(_req: Request, res: Response, next: NextFunction) {
    try {
      const coupons = await ShopService.adminListCoupons();
      res.status(200).json(coupons);
    } catch (error) {
      next(error);
    }
  }

  static async adminCreateCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const coupon = await ShopService.adminCreateCoupon(req.body);
      res.status(201).json(coupon);
    } catch (error) {
      next(error);
    }
  }

  static async adminUpdateCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      const coupon = await ShopService.adminUpdateCoupon(req.params.id as string, req.body);
      res.status(200).json(coupon);
    } catch (error) {
      next(error);
    }
  }

  static async adminDeleteCoupon(req: Request, res: Response, next: NextFunction) {
    try {
      await ShopService.adminDeleteCoupon(req.params.id as string);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  static async getUserOrders(req: any, res: Response, next: NextFunction) {
    try {
      const userId = req.user.id;
      const orders = await ShopService.getUserOrders(userId);
      res.status(200).json(orders);
    } catch (error) {
      next(error);
    }
  }
}
