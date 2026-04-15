import { Router } from 'express';
import { CommunityController } from './community.controller.js';
import { authenticate } from '../../common/middleware/auth.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: Community
 *   description: Community Circles and Feed services
 */

router.get('/circles', authenticate, CommunityController.getCircles);
router.get('/circles/:circleId/posts', authenticate, CommunityController.getPosts);
router.post('/circles/:circleId/posts', authenticate, CommunityController.createPost);

router.get('/posts/:postId/replies', authenticate, CommunityController.getReplies);
router.post('/posts/:postId/replies', authenticate, CommunityController.createReply);
router.post('/posts/:contentId/react', authenticate, CommunityController.toggleReaction);
router.post('/posts/:contentId/bookmark', authenticate, CommunityController.toggleBookmark);
router.patch('/posts/:postId/pin', authenticate, CommunityController.togglePin);
router.post('/posts/:contentId/report', authenticate, CommunityController.reportPost);
router.post('/posts/:contentId/appeal', authenticate, CommunityController.submitAppeal);

router.get('/bookmarks', authenticate, CommunityController.getBookmarks);
router.get('/events', authenticate, CommunityController.getEvents);
router.get('/challenge/weekly', authenticate, CommunityController.getWeeklyChallenge);
router.post('/circles/:circleId/visit', authenticate, CommunityController.trackVisit);

export default router;
