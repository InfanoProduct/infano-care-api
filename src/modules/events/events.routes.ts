import { Router } from 'express';
import { EventsController } from './events.controller.js';
import { authenticate } from '../../common/middleware/auth.js';

const router = Router();

router.get('/:id/questions', authenticate, EventsController.getQuestions);
router.post('/:id/questions', authenticate, EventsController.submitQuestion);
router.post('/:id/reminder', authenticate, EventsController.setReminder);

export default router;
