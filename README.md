# ReachInbox.ai — Full-Stack Email Job Scheduler

A production-style MVP for scheduling and sending emails through Ethereal SMTP, built with a modern full-stack architecture using BullMQ for reliable job scheduling backed by Redis.

## Project Overview

ReachInbox is an email scheduling platform where authenticated users can:
- Login via Google OAuth
- Compose emails and upload CSV/text files with recipients
- Schedule emails with configurable delays and hourly rate limits
- View scheduled and sent emails in a clean dashboard
- Emails survive server restarts via Redis-persisted BullMQ jobs

## Tech Stack

| Layer      | Technology                                                    |
|------------|---------------------------------------------------------------|
| Frontend   | React, TypeScript, Vite, Tailwind CSS, React Router, Axios   |
| Backend    | Node.js, TypeScript, Express.js, Passport.js                  |
| Queue      | BullMQ + Redis                                                |
| Database   | PostgreSQL + Prisma ORM                                       |
| Email      | Nodemailer + Ethereal SMTP                                    |
| Testing    | Vitest                                                        |
| DevOps     | Docker Compose (PostgreSQL + Redis)                           |

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                        │
│  Login → Dashboard → Compose → Upload CSV → Schedule Emails    │
└──────────────────────────────┬──────────────────────────────────┘
                               │ HTTP/REST
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (Express.js)                        │
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Auth     │  │ Email API    │  │ Sender API               │  │
│  │  Routes   │  │ Routes       │  │ Routes                   │  │
│  └──────────┘  └──────┬───────┘  └──────────────────────────┘  │
│                       │                                         │
│                       ▼                                         │
│              ┌──────────────┐                                   │
│              │  Email        │                                   │
│              │  Service      │                                   │
│              └──────┬───────┘                                   │
│                     │                                           │
│         ┌───────────┴───────────┐                               │
│         ▼                       ▼                               │
│  ┌──────────────┐       ┌──────────────┐                       │
│  │ PostgreSQL   │       │ BullMQ Queue │                       │
│  │ (Prisma)     │       │ (Redis)      │                       │
│  └──────────────┘       └──────┬───────┘                       │
│                                │                                │
│                                ▼                                │
│                       ┌──────────────┐                          │
│                       │ BullMQ       │                          │
│                       │ Worker       │                          │
│                       └──────┬───────┘                          │
│                              │                                  │
│              ┌───────────────┼───────────────┐                  │
│              ▼               ▼               ▼                  │
│     ┌──────────────┐ ┌────────────┐ ┌──────────────┐           │
│     │ Rate Limiter │ │ Nodemailer │ │ PostgreSQL   │           │
│     │ (Redis)      │ │ (Ethereal) │ │ (Status)     │           │
│     └──────────────┘ └────────────┘ └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

## How Scheduling Works

1. **User submits** schedule request via POST `/api/emails/schedule`
2. **Backend validates** the request and creates one Email record per recipient in PostgreSQL
3. **BullMQ delayed jobs** are created with calculated delays:
   - Email 1: delay = 0ms from start
   - Email 2: delay = delayBetweenEmails
   - Email 3: delay = 2 × delayBetweenEmails
   - etc.
4. **BullMQ worker** picks up jobs when their delay expires
5. **Worker checks rate limit** via Redis atomic counter
6. **If rate limited**: job is rescheduled to the next hour window
7. **If allowed**: email is sent via Ethereal SMTP through Nodemailer
8. **Status is updated**: SCHEDULED → PROCESSING → SENT (or FAILED)

## Restart Persistence

Redis persists BullMQ jobs via AOF (`appendonly yes`). PostgreSQL stores all email state.

When the server restarts:
- BullMQ delayed jobs already exist in Redis and continue executing
- The worker reconnects to the existing queue
- No jobs are recreated from scratch
- Email status is preserved in PostgreSQL

This is why we use `appendonly yes` in Redis Docker config and BullMQ's built-in persistence.

## Idempotency / Duplicate Prevention

Before sending, the worker:
1. Reads the email record from PostgreSQL
2. Checks if `status === SENT` → skips if already sent
3. Uses atomic status transitions: `SCHEDULED → PROCESSING → SENT`
4. If `status === PROCESSING` and updated recently → skips (another worker is handling it)
5. Each BullMQ job has a unique ID tied to the email record

This prevents duplicate sends from retries, worker restarts, or job reprocessing.

## Rate Limiting

- Uses Redis atomic `INCR` operation with TTL
- Key format: `rate-limit:{senderId}:{date}T{hour}`
- TTL is 7200 seconds (2 hours) for safety margin
- Safe across multiple workers and server instances
- When limit is reached, the job is rescheduled to the next hour (not failed)

### Rate Limit Rescheduling Algorithm

```
Hourly limit = 100
100 emails already sent this hour
Next email arrives → rate limit check fails
  ↓
Calculate next hour boundary (next full hour)
  ↓
Reschedule BullMQ job with new delay
  ↓
Next hour → rate limit resets → email is sent
```

## Concurrency

Worker concurrency is configurable via `WORKER_CONCURRENCY` env var (default: 5).

```bash
WORKER_CONCURRENCY=10  # Process 10 emails simultaneously
```

BullMQ handles job distribution across workers safely.

## Delay Between Emails

The delay between emails is enforced at the BullMQ job scheduling level:
- Each job's delay is calculated as: `baseDelay + (index × delayBetweenEmails)`
- This ensures minimum time between email sends
- The delay is enforced by BullMQ's delayed job mechanism, not by the frontend

## Ethereal Setup

Ethereal is a fake SMTP service for testing. No real emails are sent.

### Creating Ethereal Accounts

1. Visit https://ethereal.email/
2. Click "Create Ethereal Account"
3. Note the SMTP credentials provided
4. Add them as a Sender via the API or database

### Adding a Sender

```bash
curl -X POST http://localhost:5000/api/senders \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-ethereal@ethereal.email",
    "smtpHost": "smtp.ethereal.email",
    "smtpPort": 587,
    "smtpUser": "your-ethereal-user",
    "smtpPassword": "your-ethereal-password"
  }'
```

### Viewing Sent Emails

After an email is sent via Ethereal, the preview URL is logged in the backend console. Visit that URL to see the sent email.

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Navigate to APIs & Services → Credentials
4. Create OAuth 2.0 Client ID
5. Set authorized redirect URI to: `http://localhost:5000/auth/google/callback`
6. Copy Client ID and Client Secret to `.env`

## Local Setup

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- Google OAuth credentials
- Ethereal account

### Steps

```bash
# Clone the repository
git clone https://github.com/your-username/reachinbox-assignment.git
cd reachinbox-assignment

# Start PostgreSQL and Redis
docker compose up -d

# Setup Backend
cd backend
cp .env.example .env
# Edit .env with your Google OAuth credentials and session secret
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run dev

# Setup Frontend (new terminal)
cd frontend
npm install
npm run dev
```

### Add an Ethereal Sender

After the backend starts, add a sender:

```bash
# Create an Ethereal account at https://ethereal.email/
# Then add it:
curl -X POST http://localhost:5000/api/senders \
  -H "Content-Type: application/json" \
  -d '{
    "email": "sender@ethereal.email",
    "smtpHost": "smtp.ethereal.email",
    "smtpPort": 587,
    "smtpUser": "ethereal-user",
    "smtpPassword": "ethereal-password"
  }'
```

## Environment Variables

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `development` |
| `PORT` | Server port | `5000` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `REDIS_PASSWORD` | Redis password | - |
| `SESSION_SECRET` | Session encryption secret | - |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret | - |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL | `http://localhost:5000/auth/google/callback` |
| `FRONTEND_URL` | Frontend URL for CORS/redirects | `http://localhost:5173` |
| `WORKER_CONCURRENCY` | Worker parallel jobs | `5` |
| `DEFAULT_DELAY_MS` | Default delay between emails | `2000` |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | Rate limit per sender per hour | `100` |

## API Documentation

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/google` | Initiate Google OAuth |
| GET | `/auth/google/callback` | Google OAuth callback |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |

### Emails

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/emails/schedule` | Schedule emails |
| GET | `/api/emails/scheduled` | Get scheduled emails |
| GET | `/api/emails/sent` | Get sent/failed emails |
| GET | `/api/emails/:id` | Get email by ID |

### Senders

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/senders` | List all senders |
| POST | `/api/senders` | Create a sender |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

## Testing

### Run Unit Tests

```bash
cd backend
npm test
```

### Test Scenarios

1. **Scheduling**: Upload CSV with 5 addresses, set delay=2s, hourlyLimit=2
2. **Rate Limiting**: Only 2 emails should send in the first hour
3. **Delay**: Emails should be sent 2 seconds apart
4. **Idempotency**: SENT emails are never re-sent on retry
5. **Restart**: Schedule email → stop server → start server → email still sends

## Handling 1000+ Emails

With 1000 scheduled emails:
- BullMQ queues all 1000 jobs
- Worker concurrency (e.g., 5) controls parallelism
- Delay (e.g., 2s) spaces out sends
- Hourly limit (e.g., 100) caps throughput per hour
- Result: emails spread across ~10 hours at 100/hour with 2s delays

## Assumptions / Trade-offs

1. **Single sender selection**: The system uses the first available sender. In production, a sender-selection strategy would be added.
2. **Ethereal for demo**: Real SMTP would be used in production.
3. **Session-based auth**: Using connect-pg-simple for session storage.
4. **Rate limit window**: UTC-based hourly windows.
5. **No email templating**: Raw body text, no HTML templates.
6. **Max retry attempts**: 3 with exponential backoff.
