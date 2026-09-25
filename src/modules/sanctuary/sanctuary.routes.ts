import { Router } from 'express';
import { SanctuaryController } from './sanctuary.controller.js';
import { authenticate } from '../../common/middleware/auth.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Sanctuary
 *   description: Infano Sanctuary Communities, Rooms & Engagement API
 */

// 1. Communities & Memberships
router.get('/communities', authenticate, SanctuaryController.getCommunities);
router.post('/communities/:communityId/join', authenticate, SanctuaryController.joinCommunity);

// 2. Rooms & Messaging
router.get('/communities/:communityId/rooms', authenticate, SanctuaryController.getRooms);
router.get('/rooms/:roomId/messages', authenticate, SanctuaryController.getRoomMessages);
router.post('/rooms/:roomId/messages', authenticate, SanctuaryController.createMessage);
router.post('/messages/:messageId/react', authenticate, SanctuaryController.toggleReaction);

// 3. Story Threads (Collaborative Creative Writing)
router.get('/rooms/:roomId/story-threads', authenticate, SanctuaryController.getStoryThreads);
router.post('/rooms/:roomId/story-threads', authenticate, SanctuaryController.createStoryThread);
router.post('/story-threads/:threadId/append', authenticate, SanctuaryController.appendStoryLine);

// 4. Whisper Room (24h Anonymous Q&A)
router.get('/rooms/:roomId/whisper-questions', authenticate, SanctuaryController.getWhisperQuestions);
router.post('/rooms/:roomId/whisper-questions', authenticate, SanctuaryController.createWhisperQuestion);
router.post('/whisper-questions/:questionId/peer-notes', authenticate, SanctuaryController.addWhisperPeerNote);

// 5. Sprout AI Companion & The Constellation
router.get('/sprout/checkin', authenticate, SanctuaryController.getSproutCheckin);
router.get('/garden/constellation', authenticate, SanctuaryController.getConstellationSky);

// 6. Trellis (Mother's Bridge Dashboard & Letters)
router.get('/trellis/dashboard', authenticate, SanctuaryController.getTrellisDashboard);
router.post('/trellis/letters', authenticate, SanctuaryController.sendTrellisLetter);

export default router;
