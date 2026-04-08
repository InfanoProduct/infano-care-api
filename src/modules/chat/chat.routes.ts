import { Router } from 'express';
import { ChatController } from './chat.controller.js';
import { authenticate } from '../../common/middleware/auth.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Chat
 *   description: Gigi AI Assistant Chat services
 */

/**
 * @openapi
 * /api/chat/send:
 *   post:
 *     summary: Send a message to Gigi
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *               sessionId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message processed successfully.
 */
router.post('/send', authenticate, ChatController.sendMessage);

/**
 * @openapi
 * /api/chat/sessions:
 *   get:
 *     summary: List user chat sessions
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of sessions fetched.
 */
router.get('/sessions', authenticate, ChatController.getSessions);

/**
 * @openapi
 * /api/chat/history/{sessionId}:
 *   get:
 *     summary: Get session message history
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Message history fetched.
 */
router.get('/history/:sessionId', authenticate, ChatController.getHistory);

/**
 * @openapi
 * /api/chat/sessions:
 *   delete:
 *     summary: Delete all user chat sessions
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All sessions deleted successfully.
 */
router.delete('/sessions', authenticate, ChatController.deleteAllSessions);

/**
 * @openapi
 * /api/chat/sessions/{sessionId}:
 *   delete:
 *     summary: Delete a specific chat session
 *     tags: [Chat]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session deleted successfully.
 */
router.delete('/sessions/:sessionId', authenticate, ChatController.deleteSession);

export default router;
