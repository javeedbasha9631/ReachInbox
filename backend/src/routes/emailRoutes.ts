import { Router } from 'express';
import {
  scheduleEmails,
  getScheduledEmails,
  getSentEmails,
  getHistoryEmails,
  getEmailById,
  deleteEmail,
  clearHistory,
  retryEmailById,
} from '../controllers/emailController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/schedule', requireAuth, scheduleEmails);
router.get('/scheduled', requireAuth, getScheduledEmails);
router.get('/sent', requireAuth, getSentEmails);
router.get('/history', requireAuth, getHistoryEmails);
router.delete('/history/clear', requireAuth, clearHistory);
router.get('/:id', requireAuth, getEmailById);
router.delete('/:id', requireAuth, deleteEmail);
router.post('/:id/retry', requireAuth, retryEmailById);

export default router;
