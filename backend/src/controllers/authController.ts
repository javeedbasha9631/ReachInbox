import { Request, Response } from 'express';
import passport from 'passport';
import { config } from '../config';
import prisma from '../db/prisma';

export function googleAuth(req: Request, res: Response): void {
  if (!config.google.clientId || !config.google.clientSecret) {
    res.status(400).json({ success: false, error: 'Google OAuth not configured' });
    return;
  }
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    prompt: 'select_account',
  })(req, res);
}

export function googleCallback(req: Request, res: Response): void {
  passport.authenticate('google', {
    failureRedirect: `${config.frontendUrl}/login`,
    successRedirect: `${config.frontendUrl}/dashboard`,
  })(req, res);
}

export async function devLogin(req: Request, res: Response): Promise<void> {
  if (config.nodeEnv !== 'development') {
    res.status(403).json({ success: false, error: 'Dev login only available in development mode' });
    return;
  }

  try {
    const devUser = await prisma.user.upsert({
      where: { googleId: 'dev-user-001' },
      update: {},
      create: {
        googleId: 'dev-user-001',
        name: 'Dev User',
        email: 'dev@reachinbox.local',
        avatar: null,
      },
    });

    const userPayload = {
      id: devUser.id,
      googleId: devUser.googleId,
      name: devUser.name,
      email: devUser.email,
      avatar: devUser.avatar || undefined,
    };

    req.login(userPayload, (err) => {
      if (err) {
        res.status(500).json({ success: false, error: 'Login failed' });
        return;
      }
      res.json({ success: true, data: userPayload });
    });
  } catch (error) {
    console.error('Dev login error:', error);
    res.status(500).json({ success: false, error: 'Dev login failed' });
  }
}

export function getAuthConfig(_req: Request, res: Response): void {
  res.json({
    success: true,
    data: {
      googleEnabled: !!(config.google.clientId && config.google.clientSecret),
      devLoginEnabled: config.nodeEnv === 'development',
    },
  });
}

export function getMe(req: Request, res: Response): void {
  if (!req.isAuthenticated() || !req.user) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  res.json({ success: true, data: req.user });
}

export function logout(req: Request, res: Response): void {
  req.logout((err) => {
    if (err) {
      res.status(500).json({ success: false, error: 'Logout failed' });
      return;
    }
    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        res.status(500).json({ success: false, error: 'Session destroy failed' });
        return;
      }
      res.clearCookie('reachinbox.sid');
      res.json({ success: true, message: 'Logged out successfully' });
    });
  });
}
