import { Router } from 'express';
import { ParentController } from '../parent/parent.controller.js';
import { requireAuth } from '../../common/middleware/requireAuth.js';

const router = Router();
router.use(requireAuth);

router.get('/expert-sessions', ParentController.getExpertSessions);
router.patch('/expert-sessions/:id/cancel', ParentController.cancelExpertSession);
router.patch('/expert-sessions/:id/reschedule', ParentController.rescheduleExpertSession);

router.get('/parent-bookmarks', ParentController.getTeenParentBookmarks);

export default router;
