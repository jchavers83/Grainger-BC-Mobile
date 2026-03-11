import express from 'express';
import session from 'express-session';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import authRouter from './auth.js';
import apiRouter, { apiGet } from './api.js';
import { startCalendarSync } from './calendar-sync.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render.com (required for secure cookies behind reverse proxy)
app.set('trust proxy', 1);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
});

app.use(sessionMiddleware);

// Track the most recent authenticated session for calendar sync polling
let lastAuthenticatedSession = null;

// Capture authenticated sessions for background sync
app.use((req, res, next) => {
  if (req.session?.tokens?.access_token) {
    lastAuthenticatedSession = req.session;
  }
  next();
});

// Auth routes (handles /auth/* and /oauth/callback)
app.use(authRouter);

// API proxy routes
app.use('/api', apiRouter);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);

  // Start calendar sync if ENABLE_CALENDAR_SYNC is set
  if (process.env.ENABLE_CALENDAR_SYNC === 'true') {
    startCalendarSync(apiGet, () => {
      if (!lastAuthenticatedSession?.tokens?.access_token) {
        return null;
      }
      // Return a mock req object with the session for apiGet
      return { session: lastAuthenticatedSession };
    });
  } else {
    console.log('[CalSync] Calendar sync disabled. Set ENABLE_CALENDAR_SYNC=true to enable.');
  }
});
