import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import passport from 'passport';
import pgSession from 'connect-pg-simple';
import { Pool } from 'pg';
import { config } from './config';
import { configurePassport } from './config/passport';
import authRoutes from './routes/authRoutes';
import emailRoutes from './routes/emailRoutes';
import senderRoutes from './routes/senderRoutes';
import { errorHandler } from './middleware/validation';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pgPool = new Pool({ connectionString: config.databaseUrl });
const PgSession = pgSession(session);

app.use(
  session({
    store: new PgSession({
      pool: pgPool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: config.sessionSecret,
    resave: false,
    saveUninitialized: false,
    name: 'reachinbox.sid',
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    },
  })
);

configurePassport();
app.use(passport.initialize());
app.use(passport.session());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/senders', senderRoutes);

app.use(errorHandler);

export default app;
