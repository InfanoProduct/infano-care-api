import { Router } from 'express';
import { PeerLineController } from './peerline.controller.js';
import { authenticate } from '../../common/middleware/auth.js';
import { upload } from '../../common/middleware/upload.js';


const router = Router();

/**
 * @openapi
 * tags:
 *   name: PeerLine
 *   description: PeerLine structured support services
 */

router.get('/availability', authenticate, PeerLineController.getAvailability);
router.get('/topics', authenticate, PeerLineController.getTopics);
router.post('/sessions/request', authenticate, PeerLineController.requestSession);
router.get('/sessions', authenticate, PeerLineController.getSessions);
router.get('/sessions/:sessionId', authenticate, PeerLineController.getSession);
router.get('/sessions/:sessionId/queue', authenticate, PeerLineController.getQueuePosition);
router.post('/sessions/:sessionId/end', authenticate, PeerLineController.endSession);
router.post('/sessions/:sessionId/cancel', authenticate, PeerLineController.cancelSession);
router.post('/sessions/:sessionId/feedback', authenticate, PeerLineController.submitFeedback);

router.get('/mentor/status', authenticate, PeerLineController.getStatus);
router.get('/mentor/stats', authenticate, PeerLineController.getMentorStats);
router.patch('/mentor/availability', authenticate, PeerLineController.updateMentorAvailability);
router.post('/mentor/claim', authenticate, PeerLineController.claimNextSession);
router.post('/mentor/sessions/:sessionId/accept', authenticate, PeerLineController.acceptSession);
router.post('/mentor/media', authenticate, upload.single('file'), PeerLineController.uploadMedia);
router.get('/mentor/search', authenticate, PeerLineController.getMentorsByTopics);

router.patch('/mentor/expertise', authenticate, PeerLineController.updateExpertise);

export default router;

