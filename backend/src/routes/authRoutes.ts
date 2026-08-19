import { Router } from 'express';
import passport from 'passport';
import { googleCallback, getMe, logout, devLogin, getAuthConfig, grantGmail, grantGmailCallback, getGmailStatus } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';
import { config } from '../config';

const router = Router();

router.get('/config', getAuthConfig);

router.get('/google', (req, res) => {
  if (!config.google.clientId || !config.google.clientSecret) {
    res.status(400).json({ success: false, error: 'Google OAuth not configured' });
    return;
  }
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent',
    session: false,
  })(req, res);
});

router.get('/google/callback', googleCallback);
router.get('/grant-gmail', grantGmail);
router.get('/grant-gmail/callback', grantGmailCallback);
router.get('/gmail-status', requireAuth, getGmailStatus);

router.post('/dev-login', devLogin);
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);

export default router;
