import { Router } from 'express';
import { getSenders, createSender } from '../controllers/senderController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', getSenders);
router.post('/', requireAuth, createSender);

export default router;
