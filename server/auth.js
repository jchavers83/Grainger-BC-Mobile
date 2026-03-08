import { Router } from 'express';
import crypto from 'crypto';
import axios from 'axios';

const router = Router();

const APS_CLIENT_ID = process.env.APS_CLIENT_ID || 'CP72t6t9fZ3MCmCuHlD6o0Kmb2vSWkSvkB77gixfGKEyzvhr';
const APS_CALLBACK_URL = process.env.APS_CALLBACK_URL || 'https://grainger-bc-mobile.onrender.com/oauth/callback';
const APS_AUTH_URL = 'https://developer.api.autodesk.com/authentication/v2/authorize';
const APS_TOKEN_URL = 'https://developer.api.autodesk.com/authentication/v2/token';
const SCOPES = 'data:read data:write';

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

// Start OAuth flow — returns the Autodesk authorization URL
router.get('/auth/login', (req, res) => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  req.session.codeVerifier = codeVerifier;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: APS_CLIENT_ID,
    redirect_uri: APS_CALLBACK_URL,
    scope: SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });

  res.json({ url: `${APS_AUTH_URL}?${params}` });
});

// OAuth callback — exchanges authorization code for tokens
router.get('/oauth/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    return res.redirect('/?error=' + encodeURIComponent(error));
  }

  if (!code || !req.session.codeVerifier) {
    return res.redirect('/?error=missing_code_or_verifier');
  }

  try {
    const response = await axios.post(APS_TOKEN_URL, new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      code_verifier: req.session.codeVerifier,
      client_id: APS_CLIENT_ID,
      redirect_uri: APS_CALLBACK_URL,
    }), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    req.session.tokens = {
      access_token: response.data.access_token,
      refresh_token: response.data.refresh_token,
      expires_at: Date.now() + (response.data.expires_in * 1000),
    };

    delete req.session.codeVerifier;

    res.redirect('/');
  } catch (err) {
    console.error('Token exchange error:', err.response?.data || err.message);
    res.redirect('/?error=token_exchange_failed');
  }
});

// Check authentication status
router.get('/auth/status', (req, res) => {
  const tokens = req.session.tokens;
  res.json({
    authenticated: !!tokens && Date.now() < tokens.expires_at,
  });
});

// Logout
router.post('/auth/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ success: true });
  });
});

// Refresh the access token using the refresh token
export async function refreshToken(session) {
  if (!session.tokens?.refresh_token) {
    throw new Error('No refresh token available');
  }

  const response = await axios.post(APS_TOKEN_URL, new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: session.tokens.refresh_token,
    client_id: APS_CLIENT_ID,
  }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  session.tokens = {
    access_token: response.data.access_token,
    refresh_token: response.data.refresh_token || session.tokens.refresh_token,
    expires_at: Date.now() + (response.data.expires_in * 1000),
  };

  return session.tokens.access_token;
}

export default router;
