import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import { config } from '../config';
import prisma from '../db/prisma';

function generateToken(user: { id: string; googleId: string; name: string; email: string; avatar?: string }): string {
  return jwt.sign(
    { id: user.id, googleId: user.googleId, name: user.name, email: user.email, avatar: user.avatar },
    config.jwt.secret,
    { expiresIn: 60 * 60 * 24 * 7 }
  );
}

function getUserIdFromReq(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.substring(7), config.jwt.secret) as any;
      return decoded.id;
    } catch {}
  }
  return null;
}

export function googleAuth(req: Request, res: Response): void {
  if (!config.google.clientId || !config.google.clientSecret) {
    res.status(400).json({ success: false, error: 'Google OAuth not configured' });
    return;
  }
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent',
  })(req, res);
}

export function googleCallback(req: Request, res: Response): void {
  console.log('Google callback received - code:', !!req.query.code, 'state:', !!req.query.state);
  passport.authenticate('google', { session: false, failureRedirect: `${config.frontendUrl}/login` }, (err: any, user: any) => {
    if (err || !user) {
      console.error('Google callback error:', err?.message || err || 'No user returned');
      res.redirect(`${config.frontendUrl}/login`);
      return;
    }
    const token = generateToken(user);
    console.log(`Google login success for ${user.email}, redirecting to dashboard`);
    res.redirect(`${config.frontendUrl}/dashboard?token=${token}`);
  })(req, res);
}

export async function devLogin(req: Request, res: Response): Promise<void> {
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
      const token = generateToken(userPayload);
      res.json({ success: true, data: userPayload, token });
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
      devLoginEnabled: true,
    },
  });
}

export async function getGmailStatus(req: Request, res: Response): Promise<void> {
  const userId = getUserIdFromReq(req);
  if (!userId) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.refreshToken) {
    res.json({ success: true, data: { connected: false } });
    return;
  }
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        refresh_token: user.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    const tokenData = await tokenRes.json() as any;
    if (!tokenRes.ok) {
      res.json({ success: true, data: { connected: false } });
      return;
    }
    const checkRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    res.json({ success: true, data: { connected: checkRes.ok } });
  } catch {
    res.json({ success: true, data: { connected: false } });
  }
}

export function grantGmail(req: Request, res: Response): void {
  const userId = getUserIdFromReq(req);
  if (!userId) {
    res.status(401).json({ success: false, error: 'Not authenticated' });
    return;
  }
  if (!config.google.clientId || !config.google.clientSecret) {
    res.status(400).json({ success: false, error: 'Google OAuth not configured' });
    return;
  }
  const gmailCallbackUrl = `${new URL(config.google.callbackUrl).origin}/auth/grant-gmail/callback`;
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: gmailCallbackUrl,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/gmail.send',
    access_type: 'offline',
    prompt: 'consent',
    state: `gmail-grant:${userId}`,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

export async function grantGmailCallback(req: Request, res: Response): Promise<void> {
  const { code, state } = req.query;
  if (!code || !state || typeof state !== 'string' || !state.startsWith('gmail-grant:')) {
    res.redirect(`${config.frontendUrl}/dashboard?gmail_grant=failed`);
    return;
  }
  const userId = state.replace('gmail-grant:', '');
  const gmailCallbackUrl = `${new URL(config.google.callbackUrl).origin}/auth/grant-gmail/callback`;
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: gmailCallbackUrl,
      }),
    });
    const tokenData = await tokenRes.json() as any;
    if (!tokenRes.ok || !tokenData.refresh_token) {
      console.error('Gmail grant token exchange failed:', tokenData);
      res.redirect(`${config.frontendUrl}/dashboard?gmail_grant=failed`);
      return;
    }
    await prisma.user.update({
      where: { id: userId },
      data: { refreshToken: tokenData.refresh_token },
    });
    console.log(`Gmail access granted for user ${userId}`);
    res.redirect(`${config.frontendUrl}/dashboard?gmail_grant=success`);
  } catch (err) {
    console.error('Gmail grant error:', err);
    res.redirect(`${config.frontendUrl}/dashboard?gmail_grant=failed`);
  }
}

export function getMe(req: Request, res: Response): void {
  if (req.isAuthenticated() && req.user) {
    res.json({ success: true, data: req.user });
    return;
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    try {
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      res.json({ success: true, data: decoded });
      return;
    } catch {
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }
  }

  res.status(401).json({ success: false, error: 'Not authenticated' });
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
