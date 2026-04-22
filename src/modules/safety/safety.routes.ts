import { Router } from 'express';
import { SafetyController } from './safety.controller.js';
import { authenticate } from '../../common/middleware/auth.js';

const router = Router();

/**
 * @openapi
 * /api/v1/safety/crisis-resources:
 *   get:
 *     tags:
 *       - Safety
 *     summary: Get localized crisis resources and helplines
 *     parameters:
 *       - in: query
 *         name: locale
 *         schema:
 *           type: string
 *         example: en-IN
 *     responses:
 *       200:
 *         description: List of helplines
 */
router.get('/crisis-resources', authenticate, SafetyController.getCrisisResources);

export default router;
