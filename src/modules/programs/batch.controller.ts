import { Request, Response, NextFunction } from "express";
import { BatchService } from "./batch.service.js";

export class BatchController {
  /**
   * List batches for a program
   */
  static async listByProgram(req: Request, res: Response, next: NextFunction) {
    try {
      const programId = req.params.programId as string;
      const batches = await BatchService.getBatchesByProgram(programId);
      res.status(200).json({ success: true, data: batches });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get single batch details
   */
  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.id as string;
      const batch = await BatchService.getBatchById(batchId);
      res.status(200).json({ success: true, data: batch });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a new batch (Admin)
   */
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const programId = req.params.programId as string;
      const batch = await BatchService.createBatch(programId, req.body);
      res.status(201).json({ success: true, message: "Batch created successfully", data: batch });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a batch (Admin)
   */
  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.id as string;
      const batch = await BatchService.updateBatch(batchId, req.body);
      res.status(200).json({ success: true, message: "Batch updated successfully", data: batch });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a batch (Admin)
   */
  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const batchId = req.params.id as string;
      const result = await BatchService.deleteBatch(batchId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * List all batches across all programs (Admin)
   */
  static async listAll(req: Request, res: Response, next: NextFunction) {
    try {
      const batches = await BatchService.getAllBatches();
      res.status(200).json({ success: true, data: batches });
    } catch (error) {
      next(error);
    }
  }
}
