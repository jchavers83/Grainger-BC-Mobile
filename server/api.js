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
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null)
  );

  try {
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${req.session.tokens.access_token}` },
      params: cleanParams,
    });
    return response.data;
  } catch (err) {
    if (err.response?.status === 401) {
      const newToken = await refreshToken(req.session);
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${newToken}` },
        params: cleanParams,
      });
      return response.data;
    }
    throw err;
  }
}

// ─── Projects ────────────────────────────────────────────────────────────────

router.get('/projects', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/projects`, {
      limit: req.query.limit || 100,
      offset: req.query.offset || 0,
    });
    res.json(data);
  } catch (err) {
    console.error('Projects error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: 'Failed to fetch projects' });
  }
});

router.get('/projects/:id', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/projects/${req.params.id}`);
    res.json(data);
  } catch (err) {
    console.error('Project detail error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: 'Failed to fetch project' });
  }
});

// ─── Bid Packages ────────────────────────────────────────────────────────────

router.get('/projects/:id/bid-packages', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/projects/${req.params.id}/bid-packages`, {
      limit: req.query.limit || 100,
      offset: req.query.offset || 0,
    });
    res.json(data);
  } catch (err) {
    console.error('Bid packages error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: 'Failed to fetch bid packages' });
  }
});

router.get('/bid-packages/:id/invitees', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/bid-packages/${req.params.id}/invitees`, {
      limit: req.query.limit || 100,
      offset: req.query.offset || 0,
    });
    res.json(data);
  } catch (err) {
    console.error('Invitees error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: 'Failed to fetch invitees' });
  }
});

// ─── Opportunity Comments ────────────────────────────────────────────────────

router.get('/projects/:id/opportunity-comments', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/projects/${req.params.id}/opportunity-comments`, {
      limit: req.query.limit || 100,
      offset: req.query.offset || 0,
    });
    res.json(data);
  } catch (err) {
    console.error('Comments error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: 'Failed to fetch comments' });
  }
});

// ─── Contacts ────────────────────────────────────────────────────────────────

router.get('/contacts', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/contacts`, {
      limit: req.query.limit || 100,
      offset: req.query.offset || 0,
    });
    res.json(data);
  } catch (err) {
    console.error('Contacts error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: 'Failed to fetch contacts' });
  }
});

// ─── Proposals ───────────────────────────────────────────────────────────────

router.get('/proposals', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/proposals`, {
      limit: req.query.limit || 100,
      offset: req.query.offset || 0,
    });
    res.json(data);
  } catch (err) {
    console.error('Proposals error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: 'Failed to fetch proposals' });
  }
});

router.get('/proposals/:id', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/proposals/${req.params.id}`);
    res.json(data);
  } catch (err) {
    console.error('Proposal detail error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: 'Failed to fetch proposal' });
  }
});

// ─── Files (Autodesk Docs via Data Management API) ───────────────────────────

router.get('/projects/:id/files', requireAuth, async (req, res) => {
  try {
    // Get the BC project to find linked Autodesk Docs project
    const project = await apiGet(req, `${BC_BASE}/projects/${req.params.id}`);

    const accProjectId = project.autodeskDocsProjectId || project.linkedProjectId;
    if (!accProjectId) {
      return res.json({ results: [], message: 'No linked Autodesk Docs project found' });
    }

    // Fetch top-level folder contents from Data Management API
    const topFolders = await apiGet(req, `${DM_BASE}/projects/b.${accProjectId}/folders`);
    const rootFolderId = topFolders?.data?.[0]?.id;

    if (!rootFolderId) {
      return res.json({ results: [], message: 'No root folder found' });
    }

    const contents = await apiGet(req, `${DM_BASE}/projects/b.${accProjectId}/folders/${rootFolderId}/contents`);
    res.json(contents);
  } catch (err) {
    console.error('Files error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ error: 'Failed to fetch files' });
  }
});

export default router;
