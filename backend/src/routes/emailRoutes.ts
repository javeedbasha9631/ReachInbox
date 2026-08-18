import { Router } from 'express';
import {
  scheduleEmails,
  getScheduledEmails,
  getSentEmails,
  getEmailById,
} from '../controllers/emailController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/schedule', requireAuth, scheduleEmails);
router.get('/scheduled', requireAuth, getScheduledEmails);
router.get('/sent', requireAuth, getSentEmails);
router.get('/:id', requireAuth, getEmailById);

export default router;
