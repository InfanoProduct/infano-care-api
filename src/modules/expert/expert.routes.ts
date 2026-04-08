import { Router } from 'express';
import { ExpertController } from './expert.controller.js';
import { authenticate } from '../../common/middleware/auth.js';

const router = Router();
const expertController = new ExpertController();

/**
 * @openapi
 * /api/expert/list:
 *   get:
 *     summary: List all experts
 *     tags: [Expert Chat]
 *     responses:
 *       200:
 *         description: List of experts.
 */
router.get('/list', authenticate, expertController.listExperts);

/**
 * @openapi
 * /api/expert/session:
 *   post:
 *     summary: Create or get expert chat session
 *     tags: [Expert Chat]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               expertId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Expert session info.
 */
router.post('/session', authenticate, expertController.getOrCreateSession);

/**
 * @openapi
 * /api/expert/messages/{sessionId}:
 *   get:
 *     summary: Get chat history with expert
 *     tags: [Expert Chat]
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Array of messages.
 */
router.get('/messages/:sessionId', authenticate, expertController.getMessages);

router.get('/my-sessions', authenticate, (req, res) => expertController.getMySessions(req, res));
router.patch('/session/:sessionId/read', authenticate, (req, res) => expertController.markAsRead(req, res));

export default router;
