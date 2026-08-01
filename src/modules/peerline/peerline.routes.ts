import { Router } from 'express';
import { PeerLineController } from './peerline.controller.js';
import { authenticate, optionalAuthenticate } from '../../common/middleware/auth.js';
import { upload } from '../../common/middleware/upload.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: PeerLine
 *   description: PeerLine peer-to-teen chat services
 */

// ─── Availability & Topics ────────────────────────────────────────────────────
router.get('/availability', authenticate, PeerLineController.getAvailability);
router.get('/topics', authenticate, PeerLineController.getTopics);

// ─── Connections (new Instagram-style open chat model) ────────────────────────
router.post('/connections/request', authenticate, PeerLineController.requestConnection);
router.post('/connections/:connectionId/accept', authenticate, PeerLineController.acceptConnection);
router.post('/connections/:connectionId/decline', authenticate, PeerLineController.declineConnection);

// ─── Session/Connection history (kept for backward compat) ───────────────────
router.get('/sessions', authenticate, PeerLineController.getSessions);
router.get('/sessions/:sessionId', authenticate, PeerLineController.getSession);
router.get('/sessions/:sessionId/messages', authenticate, PeerLineController.getMessages);

// Legacy session endpoints (non-destructive, kept for existing data) 
router.post('/sessions/request', authenticate, PeerLineController.requestSession);
router.post('/mentor/sessions/:sessionId/accept', authenticate, PeerLineController.acceptSession);

// ─── Mentor Endpoints ─────────────────────────────────────────────────────────
router.get('/mentor/status', authenticate, PeerLineController.getStatus);
router.get('/mentor/stats', authenticate, PeerLineController.getMentorStats);
router.patch('/mentor/availability', authenticate, PeerLineController.updateMentorAvailability);
router.post('/mentor/media', authenticate, upload.single('file'), PeerLineController.uploadMedia);
router.get('/mentor/search', authenticate, PeerLineController.getMentorsByTopics);
router.post('/mentor/onboard', PeerLineController.onboardMentor);
router.post('/mentor/apply', optionalAuthenticate, PeerLineController.applyToMentor);
router.patch('/mentor/expertise', authenticate, PeerLineController.updateExpertise);

// ─── Training Endpoints ───────────────────────────────────────────────────────
router.post('/training/progress', authenticate, PeerLineController.updateTrainingProgress);
router.post('/training/assessment', authenticate, PeerLineController.submitAssessment);
router.post('/training/conduct-agree', authenticate, PeerLineController.agreeToConduct);
router.get('/training/status', authenticate, PeerLineController.getTrainingStatus);
router.get('/training/course', PeerLineController.getTrainingCourse);
router.get('/training/episodes/:episodeSlug', PeerLineController.getTrainingEpisode);

export default router;
