import { Request, Response, NextFunction } from 'express';
import { SafetyService } from './safety.service.js';

const safetyService = new SafetyService();

export class SafetyController {
  static async getCrisisResources(req: Request, res: Response, next: NextFunction) {
    try {
      const locale = (req.query.locale as string) || 'en-IN';
      const resources = await safetyService.getCrisisResources(locale);
      res.status(200).json(resources);
    } catch (error) { next(error); }
  }

  // ─── Trusted Contacts ────────────────────────────────────────────────────────

  static async getTrustedContacts(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const contacts = await safetyService.getTrustedContacts(userId);
      res.status(200).json(contacts);
    } catch (error) { next(error); }
  }

  static async addTrustedContact(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { name, phone, relation } = req.body;
      const contact = await safetyService.addTrustedContact(userId, { name, phone, relation });
      res.status(201).json(contact);
    } catch (error) { next(error); }
  }

  static async deleteTrustedContact(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const contactId = req.params.id as string;
      await safetyService.deleteTrustedContact(userId, contactId);
      res.status(200).json({ message: 'Deleted' });
    } catch (error) { next(error); }
  }

  static async updateContactEmergencies(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const contactId = req.params.id as string;
      const { emergencyTypes } = req.body;
      await safetyService.updateContactEmergencies(userId, contactId, emergencyTypes);
      res.status(200).json({ message: 'Updated emergencies' });
    } catch (error) { next(error); }
  }

  // ─── SOS Preferences ─────────────────────────────────────────────────────────

  static async getPreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const prefs = await safetyService.getPreferences(userId);
      res.status(200).json(prefs);
    } catch (error) { next(error); }
  }

  static async savePreferences(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { defaultEmergencyType, locationEnabled, setupCompleted } = req.body;
      const prefs = await safetyService.savePreferences(userId, {
        defaultEmergencyType,
        locationEnabled,
        setupCompleted,
      });
      res.status(200).json(prefs);
    } catch (error) { next(error); }
  }

  // ─── SOS Trigger ─────────────────────────────────────────────────────────────

  static async triggerSos(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { lat, lng, emergencyType } = req.body;
      const incident = await safetyService.triggerSos(userId, lat, lng, emergencyType, false);
      res.status(201).json(incident);
    } catch (error) { next(error); }
  }

  static async testSos(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const { lat, lng, emergencyType } = req.body;
      const incident = await safetyService.triggerSos(userId, lat, lng, emergencyType, true);
      res.status(201).json(incident);
    } catch (error) { next(error); }
  }

  static async getActiveIncident(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const incident = await safetyService.getActiveIncident(userId);
      res.status(200).json(incident ?? null);
    } catch (error) { next(error); }
  }

  static async updateLocation(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const incidentId = req.params.id as string;
      const { lat, lng } = req.body;
      const incident = await safetyService.updateSosLocation(userId, incidentId, lat, lng);
      res.status(200).json(incident);
    } catch (error) { next(error); }
  }

  static async cancelSos(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const incidentId = req.params.id as string;
      const incident = await safetyService.cancelSos(userId, incidentId);
      res.status(200).json(incident);
    } catch (error) { next(error); }
  }

  static async resolveSos(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = (req as any).user.id;
      const incidentId = req.params.id as string;
      const incident = await safetyService.resolveSos(userId, incidentId);
      res.status(200).json(incident);
    } catch (error) { next(error); }
  }
}
