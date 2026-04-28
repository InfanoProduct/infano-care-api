import { Request, Response } from "express";
import { friendProfileSchema, friendSwipeSchema, friendDiscoverQuerySchema } from "./friends.schema.js";
import { FriendsService } from "./friends.service.js";
import { logger } from "../../config/logger.js";
import { ZodError } from "zod";

const friendsService = new FriendsService();

export const getProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const profile = await friendsService.getProfile(userId);
    res.json(profile || null);
  } catch (error) {
    logger.error({ err: error }, "Error getting friend profile:");
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const data = friendProfileSchema.parse(req.body);
    const profile = await friendsService.optInAndSetupProfile(userId, data);
    res.json(profile);
  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn({ errors: error.errors }, "Friend profile validation error:");
      return res.status(422).json({ error: "Validation failed", details: error.errors });
    }
    logger.error({ err: error }, "Error updating friend profile:");
    res.status(500).json({ error: "Internal server error" });
  }
};

export const discoverProfiles = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const { batch_size, radius } = friendDiscoverQuerySchema.parse(req.query);
    const profiles = await friendsService.discoverProfiles(userId, batch_size || 20, radius || 'city');
    res.json({ profiles });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(422).json({ error: "Validation failed", details: error.errors });
    }
    logger.error({ err: error }, "Error discovering profiles:");
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getNearbyFriends = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const profiles = await friendsService.getNearbyPotentials(userId);
    res.json(profiles);
  } catch (error) {
    logger.error({ err: error }, "Error fetching nearby friends:");
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getSaved = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const saved = await friendsService.getSavedProfiles(userId);
    res.json({ saved_profiles: saved });
  } catch (error) {
    logger.error({ err: error }, "Error fetching saved profiles:");
    res.status(500).json({ error: "Internal server error" });
  }
};

export const swipeFriend = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const { targetId, action } = friendSwipeSchema.parse(req.body);
    const result = await friendsService.recordSwipe(userId, targetId, action);
    res.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(422).json({ error: "Validation failed", details: error.errors });
    }
    logger.error({ err: error }, "Error swiping friend:");
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getMatches = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    const matches = await friendsService.getMatches(userId, status);
    res.json({ matches });
  } catch (error) {
    logger.error({ err: error }, "Error getting matches:");
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
};

export const unmatch = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const matchId = String(req.params.id || req.params.matchId);
    const result = await friendsService.unmatch(userId, matchId);
    res.json(result);
  } catch (error) {
    logger.error({ err: error }, "Error unmatching:");
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
};

export const deleteProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    await friendsService.deleteProfile(userId);
    res.status(204).send();
  } catch (error) {
    logger.error({ err: error }, "Error deleting friend profile:");
    res.status(500).json({ error: "Internal server error" });
  }
};

export const toggleDiscovery = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user!.id;
    const { isActive } = req.body;
    const profile = await friendsService.toggleDiscovery(userId, isActive);
    res.json(profile);
  } catch (error) {
    logger.error({ err: error }, "Error toggling discovery:");
    res.status(500).json({ error: error instanceof Error ? error.message : "Internal server error" });
  }
};
