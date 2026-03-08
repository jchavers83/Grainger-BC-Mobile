import { Router } from 'express';
import axios from 'axios';
import { refreshToken } from './auth.js';

const router = Router();
const BC_BASE = 'https://developer.api.autodesk.com/construction/buildingconnected/v2';
const DM_BASE = 'https://developer.api.autodesk.com/data/v1';

// Require authentication middleware
async function requireAuth(req, res, next) {
  if (!req.session.tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // Proactively refresh if token expires within 60 seconds
  if (Date.now() >= req.session.tokens.expires_at - 60000) {
    try {
      await refreshToken(req.session);
    } catch (err) {
      return res.status(401).json({ error: 'Token refresh failed' });
    }
  }

  next();
}

// Authenticated GET request with automatic retry on 401
async function apiGet(req, url, params = {}) {
  const cleanParams = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '')
  );

  const config = {
    headers: { Authorization: `Bearer ${req.session.tokens.access_token}` },
  };

  // Only include params if there are any
  if (Object.keys(cleanParams).length > 0) {
    config.params = cleanParams;
  }

  try {
    const response = await axios.get(url, config);
    return response.data;
  } catch (err) {
    if (err.response?.status === 401) {
      const newToken = await refreshToken(req.session);
      config.headers.Authorization = `Bearer ${newToken}`;
      const response = await axios.get(url, config);
      return response.data;
    }
    throw err;
  }
}

// ─── Projects ────────────────────────────────────────────────────────────────

router.get('/projects', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/projects`);
    res.json(data);
  } catch (err) {
    console.error('Projects error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch projects',
      detail: err.response?.data || err.message,
    });
  }
});

router.get('/projects/:id', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/projects/${req.params.id}`);
    res.json(data);
  } catch (err) {
    console.error('Project detail error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch project',
      detail: err.response?.data || err.message,
    });
  }
});

// ─── Bid Packages ────────────────────────────────────────────────────────────

router.get('/projects/:id/bid-packages', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/projects/${req.params.id}/bid-packages`);
    res.json(data);
  } catch (err) {
    console.error('Bid packages error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch bid packages',
      detail: err.response?.data || err.message,
    });
  }
});

router.get('/bid-packages/:id/invitees', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/bid-packages/${req.params.id}/invitees`);
    res.json(data);
  } catch (err) {
    console.error('Invitees error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch invitees',
      detail: err.response?.data || err.message,
    });
  }
});

// ─── Opportunity Comments ────────────────────────────────────────────────────

router.get('/projects/:id/opportunity-comments', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/projects/${req.params.id}/opportunity-comments`);
    res.json(data);
  } catch (err) {
    console.error('Comments error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch comments',
      detail: err.response?.data || err.message,
    });
  }
});

// ─── Contacts ────────────────────────────────────────────────────────────────

router.get('/contacts', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/contacts`);
    res.json(data);
  } catch (err) {
    console.error('Contacts error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch contacts',
      detail: err.response?.data || err.message,
    });
  }
});

// ─── Proposals ───────────────────────────────────────────────────────────────

router.get('/proposals', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/proposals`);
    res.json(data);
  } catch (err) {
    console.error('Proposals error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch proposals',
      detail: err.response?.data || err.message,
    });
  }
});

router.get('/proposals/:id', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/proposals/${req.params.id}`);
    res.json(data);
  } catch (err) {
    console.error('Proposal detail error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch proposal',
      detail: err.response?.data || err.message,
    });
  }
});

// ─── Files (Autodesk Docs via Data Management API) ───────────────────────────

router.get('/projects/:id/files', requireAuth, async (req, res) => {
  try {
    const project = await apiGet(req, `${BC_BASE}/projects/${req.params.id}`);

    const accProjectId = project.autodeskDocsProjectId || project.linkedProjectId;
    if (!accProjectId) {
      return res.json({ results: [], message: 'No linked Autodesk Docs project found' });
    }

    const topFolders = await apiGet(req, `${DM_BASE}/projects/b.${accProjectId}/folders`);
    const rootFolderId = topFolders?.data?.[0]?.id;

    if (!rootFolderId) {
      return res.json({ results: [], message: 'No root folder found' });
    }

    const contents = await apiGet(req, `${DM_BASE}/projects/b.${accProjectId}/folders/${rootFolderId}/contents`);
    res.json(contents);
  } catch (err) {
    console.error('Files error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch files',
      detail: err.response?.data || err.message,
    });
  }
});

// ─── Debug: raw API passthrough ──────────────────────────────────────────────
// Helps diagnose exact API responses during development
router.get('/debug/raw', requireAuth, async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.status(400).json({ error: 'Provide ?url= parameter' });
    const data = await apiGet(req, url);
    res.json(data);
  } catch (err) {
    res.status(err.response?.status || 500).json({
      error: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });
  }
});

export default router;
