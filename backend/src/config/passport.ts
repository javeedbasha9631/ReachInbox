import passport from 'passport';
import { Strategy as GoogleStrategy, VerifyCallback } from 'passport-google-oauth20';
import prisma from '../db/prisma';
import { config } from './index';

export function configurePassport(): void {
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  passport.deserializeUser((user: Express.User, done) => {
    done(null, user);
  });

  if (!config.google.clientId || !config.google.clientSecret) {
    console.warn('Google OAuth credentials not configured. Google login will not work.');
    return;
  }

  passport.use(
    new GoogleStrategy(
      {
        clientID: config.google.clientId,
        clientSecret: config.google.clientSecret,
        callbackURL: config.google.callbackUrl,
      },
      async (_accessToken: string, _refreshToken: string, profile: any, done: VerifyCallback) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value;
          const name = profile.displayName;
          const avatar = profile.photos?.[0]?.value;

          if (!email) {
            return done(new Error('No email found in Google profile'));
          }

          const user = await prisma.user.upsert({
            where: { googleId },
            update: { name, email, avatar },
            create: { googleId, name, email, avatar },
          });

          return done(null, {
            id: user.id,
            googleId: user.googleId,
            name: user.name,
            email: user.email,
            avatar: user.avatar || undefined,
          });
        } catch (error) {
          return done(error as Error);
        }
      }
    )
  );
}
