import { Router } from 'express';
import axios from 'axios';
import { refreshToken } from './auth.js';

const router = Router();
const BC_BASE = 'https://developer.api.autodesk.com/construction/buildingconnected/v2';

// Require authentication middleware
async function requireAuth(req, res, next) {
  if (!req.session.tokens) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

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

// ─── Bid Packages (top-level, filtered by projectId) ────────────────────────

router.get('/projects/:id/bid-packages', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/bid-packages`, {
      'filter[projectId]': req.params.id,
    });
    res.json(data);
  } catch (err) {
    console.error('Bid packages error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch bid packages',
      detail: err.response?.data || err.message,
    });
  }
});

router.get('/bid-packages/:id', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/bid-packages/${req.params.id}`);
    res.json(data);
  } catch (err) {
    console.error('Bid package detail error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch bid package',
      detail: err.response?.data || err.message,
    });
  }
});

// ─── Invites (bidders per bid package, filtered by projectId) ────────────────

router.get('/bid-packages/:id/invitees', requireAuth, async (req, res) => {
  try {
    // Try invites filtered by project, then fall back to bid-level invites
    const data = await apiGet(req, `${BC_BASE}/invites`, {
      'filter[bidPackageId]': req.params.id,
    });
    res.json(data);
  } catch (err) {
    console.error('Invitees error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch invitees',
      detail: err.response?.data || err.message,
    });
  }
});

// ─── Bids (filtered by projectId) ───────────────────────────────────────────

router.get('/projects/:id/bids', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/bids`, {
      'filter[projectId]': req.params.id,
    });
    res.json(data);
  } catch (err) {
    console.error('Bids error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch bids',
      detail: err.response?.data || err.message,
    });
  }
});

// ─── Bid Line Items ─────────────────────────────────────────────────────────

router.get('/bids/:id/line-items', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/bids/${req.params.id}/line-items`);
    res.json(data);
  } catch (err) {
    console.error('Bid line items error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch bid line items',
      detail: err.response?.data || err.message,
    });
  }
});

// ─── Opportunities ──────────────────────────────────────────────────────────

router.get('/opportunities', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/opportunities`);
    res.json(data);
  } catch (err) {
    console.error('Opportunities error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch opportunities',
      detail: err.response?.data || err.message,
    });
  }
});

router.get('/opportunities/:id', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/opportunities/${req.params.id}`);
    res.json(data);
  } catch (err) {
    console.error('Opportunity detail error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch opportunity',
      detail: err.response?.data || err.message,
    });
  }
});

// ─── Opportunity Comments (messages) ─────────────────────────────────────────

router.get('/projects/:id/opportunity-comments', requireAuth, async (req, res) => {
  try {
    // Try to get opportunities for this project, then get comments for each
    const opps = await apiGet(req, `${BC_BASE}/opportunities`, {
      'filter[projectId]': req.params.id,
    });
    const oppList = opps?.results || opps || [];

    // Gather comments from all opportunities for this project
    const allComments = [];
    for (const opp of oppList.slice(0, 10)) {
      try {
        const comments = await apiGet(req, `${BC_BASE}/opportunities/${opp.id}/comments`);
        const commentList = comments?.results || comments || [];
        allComments.push(...commentList);
      } catch {
        // skip if comments endpoint fails for this opportunity
      }
    }

    res.json({ results: allComments });
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

// ─── Project Bid Forms (proposals/line items) ────────────────────────────────

router.get('/proposals', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/project-bid-forms`);
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
    const form = await apiGet(req, `${BC_BASE}/project-bid-forms/${req.params.id}`);
    // Also fetch line items
    let lineItems = [];
    try {
      const liData = await apiGet(req, `${BC_BASE}/project-bid-forms/${req.params.id}/line-items`);
      lineItems = liData?.results || liData || [];
    } catch {
      // line items may not exist
    }
    res.json({ ...form, lineItems });
  } catch (err) {
    console.error('Proposal detail error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch proposal',
      detail: err.response?.data || err.message,
    });
  }
});

// ─── Files (via ACC Docs link from project) ──────────────────────────────────

router.get('/projects/:id/files', requireAuth, async (req, res) => {
  try {
    const project = await apiGet(req, `${BC_BASE}/projects/${req.params.id}`);

    // BC projects link to ACC via currentAccLinkedProjectId or currentAccDocsFolderId
    const accProjectId = project.currentAccLinkedProjectId;
    const accFolderId = project.currentAccDocsFolderId;

    if (accFolderId) {
      // Directly fetch folder contents
      const contents = await apiGet(req,
        `https://developer.api.autodesk.com/data/v1/projects/b.${accProjectId}/folders/${accFolderId}/contents`
      );
      res.json(contents);
    } else if (accProjectId) {
      // Get top folders first
      const topFolders = await apiGet(req,
        `https://developer.api.autodesk.com/project/v1/hubs/b.${accProjectId}/projects/b.${accProjectId}/topFolders`
      );
      res.json(topFolders);
    } else {
      res.json({ results: [], message: 'No linked Autodesk Docs project found' });
    }
  } catch (err) {
    console.error('Files error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch files',
      detail: err.response?.data || err.message,
    });
  }
});

// ─── Project Costs ──────────────────────────────────────────────────────────

router.get('/projects/:id/costs', requireAuth, async (req, res) => {
  try {
    const data = await apiGet(req, `${BC_BASE}/projects/${req.params.id}/costs`);
    res.json(data);
  } catch (err) {
    console.error('Costs error:', JSON.stringify(err.response?.data || err.message));
    res.status(err.response?.status || 500).json({
      error: 'Failed to fetch costs',
      detail: err.response?.data || err.message,
    });
  }
});

// ─── Debug endpoint ──────────────────────────────────────────────────────────

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
