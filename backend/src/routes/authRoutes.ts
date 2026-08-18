import { Router } from 'express';
import passport from 'passport';
import { googleCallback, getMe, logout, devLogin, getAuthConfig } from '../controllers/authController';
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
    prompt: 'select_account',
  })(req, res);
});

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${config.frontendUrl}/login`,
    successRedirect: `${config.frontendUrl}/dashboard`,
  })
);

router.post('/dev-login', devLogin);
router.get('/me', requireAuth, getMe);
router.post('/logout', requireAuth, logout);

export default router;
