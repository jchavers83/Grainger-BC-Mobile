import { google } from 'googleapis';
import { GoogleAuth } from 'google-auth-library';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, '..', 'calendar-sync-log.json');

const SERVICE_ACCOUNT_EMAIL = 'grainger-calendar-sync@grainger-calendar-sync.iam.gserviceaccount.com';
const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';

// Recipient rules
const TEAM_EMAILS = {
  josh: 'josh@graingercs.com',
  suzanne: 'suzanne@graingercs.com',
  levi: 'levi@graingercs.com',
  frances: 'frances@graingercs.com',
};

// Creator emails that trigger full distribution
const FULL_DISTRIBUTION_CREATORS = [
  TEAM_EMAILS.josh,
  TEAM_EMAILS.suzanne,
  TEAM_EMAILS.levi,
];

// ─── Auth ──────────────────────────────────────────────────────────────────────

function getAuthClient(subjectEmail) {
  const credsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const authConfig = {
    scopes: [CALENDAR_SCOPE],
    clientOptions: {
      subject: subjectEmail,
    },
  };
  if (credsJson) {
    authConfig.credentials = JSON.parse(credsJson);
  }
  const auth = new GoogleAuth(authConfig);
  return auth;
}

async function getCalendarClient(userEmail) {
  const auth = getAuthClient(userEmail);
  const client = await auth.getClient();
  return google.calendar({ version: 'v3', auth: client });
}

// ─── Event Log ─────────────────────────────────────────────────────────────────

function loadLog() {
  try {
    if (fs.existsSync(LOG_FILE)) {
      return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
    }
  } catch {
    // If corrupted, start fresh
  }
  return {};
}

function saveLog(log) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
}

// Log key format: `${projectId}:${dateType}:${recipientEmail}`
function logKey(projectId, dateType, recipientEmail) {
  return `${projectId}:${dateType}:${recipientEmail}`;
}

// ─── Date Helpers ──────────────────────────────────────────────────────────────

function dayBefore(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 1);
  return d;
}

function twoDaysBefore(dateStr) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() - 2);
  return d;
}

function toAllDayDate(date) {
  // Format as YYYY-MM-DD for all-day events
  return date.toISOString().split('T')[0];
}

function toDateTime(date) {
  return date.toISOString();
}

// ─── Event Builders ────────────────────────────────────────────────────────────

function buildSiteVisitReminder(project) {
  const reminderDate = dayBefore(project.jobWalkAt);
  return {
    summary: `Site Visit Tomorrow - ${project.name}`,
    description: `Site visit for ${project.name}${project.client ? ` (${project.client})` : ''} is tomorrow.\n\nSite visit: ${new Date(project.jobWalkAt).toLocaleString()}`,
    start: { date: toAllDayDate(reminderDate) },
    end: { date: toAllDayDate(reminderDate) },
    reminders: { useDefault: true },
  };
}

function buildRsvpReminder(project) {
  const reminderDate = dayBefore(project.jobWalkAt);
  return {
    summary: `RSVP to site visit - ${project.name}`,
    description: `Remember to RSVP for the site visit for ${project.name}${project.client ? ` (${project.client})` : ''}.\n\nSite visit: ${new Date(project.jobWalkAt).toLocaleString()}`,
    start: { date: toAllDayDate(reminderDate) },
    end: { date: toAllDayDate(reminderDate) },
    reminders: { useDefault: true },
  };
}

function buildRfiReminder(project) {
  const reminderDate = dayBefore(project.rfisDueAt);
  return {
    summary: `RFIs Due Tomorrow - ${project.name}`,
    description: `RFI deadline for ${project.name}${project.client ? ` (${project.client})` : ''} is tomorrow.\n\nRFI due: ${new Date(project.rfisDueAt).toLocaleString()}`,
    start: { date: toAllDayDate(reminderDate) },
    end: { date: toAllDayDate(reminderDate) },
    reminders: { useDefault: true },
  };
}

function buildSubBidsReminder(project) {
  const reminderDate = twoDaysBefore(project.bidsDueAt);
  return {
    summary: `Sub Bids Due in 2 Days - ${project.name}`,
    description: `Sub bids for ${project.name}${project.client ? ` (${project.client})` : ''} are due in 2 days.\n\nSub bids due: ${new Date(project.bidsDueAt).toLocaleString()}`,
    start: { date: toAllDayDate(reminderDate) },
    end: { date: toAllDayDate(reminderDate) },
    reminders: { useDefault: true },
  };
}

function buildClientBidDueEvent(project) {
  const dueDate = new Date(project.dueAt);
  const endDate = new Date(dueDate);
  endDate.setHours(endDate.getHours() + 1);
  return {
    summary: `Client Bid Due - ${project.name}`,
    description: `Client bid for ${project.name}${project.client ? ` (${project.client})` : ''} is due now.`,
    start: { dateTime: toDateTime(dueDate), timeZone: 'America/Chicago' },
    end: { dateTime: toDateTime(endDate), timeZone: 'America/Chicago' },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 1440 }, // 24 hours
        { method: 'popup', minutes: 180 },  // 3 hours
      ],
    },
  };
}

// ─── Determine Recipients ──────────────────────────────────────────────────────

function getRecipients(creatorEmail, dateType) {
  const creator = (creatorEmail || '').toLowerCase();

  // Frances's projects: only Josh and Suzanne get client bid due events
  if (creator === TEAM_EMAILS.frances) {
    if (dateType === 'clientBidDue') {
      return [TEAM_EMAILS.josh, TEAM_EMAILS.suzanne];
    }
    return [];
  }

  // Projects by Josh, Suzanne, or Levi: all three get all events
  if (FULL_DISTRIBUTION_CREATORS.includes(creator)) {
    return [TEAM_EMAILS.josh, TEAM_EMAILS.suzanne, TEAM_EMAILS.levi];
  }

  // Unknown creator: default to full distribution
  return [TEAM_EMAILS.josh, TEAM_EMAILS.suzanne, TEAM_EMAILS.levi];
}

// ─── Create or Update Event ────────────────────────────────────────────────────

async function createOrUpdateEvent(recipientEmail, eventData, projectId, dateType, currentDateValue, log) {
  const key = logKey(projectId, dateType, recipientEmail);
  const existing = log[key];

  try {
    const calendar = await getCalendarClient(recipientEmail);

    if (existing) {
      // Date hasn't changed - skip
      if (existing.dateValue === currentDateValue) {
        return;
      }
      // Date changed - update existing event
      try {
        await calendar.events.update({
          calendarId: recipientEmail,
          eventId: existing.calendarEventId,
          requestBody: eventData,
        });
        log[key] = {
          ...existing,
          dateValue: currentDateValue,
          updatedAt: new Date().toISOString(),
        };
        console.log(`[CalSync] Updated ${dateType} for ${projectId} on ${recipientEmail}`);
        return;
      } catch (updateErr) {
        // If event was deleted externally, fall through to create
        if (updateErr.code !== 404 && updateErr.code !== 410) {
          console.error(`[CalSync] Update failed for ${key}:`, updateErr.message);
          return;
        }
      }
    }

    // Create new event
    const result = await calendar.events.insert({
      calendarId: recipientEmail,
      requestBody: eventData,
    });

    log[key] = {
      projectId,
      dateType,
      recipientEmail,
      calendarEventId: result.data.id,
      dateValue: currentDateValue,
      createdAt: new Date().toISOString(),
    };
    console.log(`[CalSync] Created ${dateType} for ${projectId} on ${recipientEmail}`);
  } catch (err) {
    console.error(`[CalSync] Error for ${key}:`, err.message);
  }
}

// ─── Main Sync Function ────────────────────────────────────────────────────────

async function syncProjectCalendarEvents(project, creatorEmail, log) {
  const projectId = project.id;

  // Site visit reminder (day before)
  if (project.jobWalkAt) {
    const recipients = getRecipients(creatorEmail, 'siteVisit');
    for (const email of recipients) {
      await createOrUpdateEvent(
        email,
        buildSiteVisitReminder(project),
        projectId, 'siteVisit', project.jobWalkAt, log
      );
    }

    // RSVP reminder (day before site visit)
    const rsvpRecipients = getRecipients(creatorEmail, 'rsvpReminder');
    for (const email of rsvpRecipients) {
      await createOrUpdateEvent(
        email,
        buildRsvpReminder(project),
        projectId, 'rsvpReminder', project.jobWalkAt, log
      );
    }
  }

  // RFI due reminder (day before)
  if (project.rfisDueAt) {
    const recipients = getRecipients(creatorEmail, 'rfiDue');
    for (const email of recipients) {
      await createOrUpdateEvent(
        email,
        buildRfiReminder(project),
        projectId, 'rfiDue', project.rfisDueAt, log
      );
    }
  }

  // Sub bids due reminder (2 days before)
  if (project.bidsDueAt) {
    const recipients = getRecipients(creatorEmail, 'subBidsDue');
    for (const email of recipients) {
      await createOrUpdateEvent(
        email,
        buildSubBidsReminder(project),
        projectId, 'subBidsDue', project.bidsDueAt, log
      );
    }
  }

  // Client bid due (exact date/time)
  if (project.dueAt) {
    const recipients = getRecipients(creatorEmail, 'clientBidDue');
    for (const email of recipients) {
      await createOrUpdateEvent(
        email,
        buildClientBidDueEvent(project),
        projectId, 'clientBidDue', project.dueAt, log
      );
    }
  }
}

// ─── Fetch Projects & Team from BC API ─────────────────────────────────────────

async function fetchProjectsWithCreators(apiGet, req) {
  const data = await apiGet(req, 'https://developer.api.autodesk.com/construction/buildingconnected/v2/projects');
  const projects = data?.results || data || [];

  const results = [];
  for (const project of projects) {
    let creatorEmail = null;

    // Try to get team members to find the creator/lead
    try {
      const teamData = await apiGet(
        req,
        'https://developer.api.autodesk.com/construction/buildingconnected/v2/project-team-members',
        { 'filter[projectId]': project.id }
      );
      const members = teamData?.results || [];
      // Look for the lead/creator
      const lead = members.find(m => {
        const role = (m.role || m.projectRole || m.type || '').toUpperCase();
        return role === 'LEAD' || role === 'CREATOR' || role === 'OWNER' || m.isLead === true;
      });
      if (lead) {
        creatorEmail = lead.email || lead.contactEmail || null;
      }
      // If no lead found, check createdBy on the project
      if (!creatorEmail && project.createdBy) {
        creatorEmail = project.createdBy.email || project.createdBy;
      }
    } catch {
      // If team endpoint fails, try project's createdBy
      if (project.createdBy) {
        creatorEmail = project.createdBy.email || project.createdBy;
      }
    }

    results.push({ project, creatorEmail });
  }

  return results;
}

// ─── Poll Runner ───────────────────────────────────────────────────────────────

let pollInterval = null;

export function startCalendarSync(apiGet, getAuthenticatedReq) {
  console.log('[CalSync] Starting calendar sync (polls every 30 minutes)');

  async function poll() {
    console.log(`[CalSync] Polling at ${new Date().toISOString()}`);
    try {
      const req = getAuthenticatedReq();
      if (!req) {
        console.log('[CalSync] No authenticated session available, skipping');
        return;
      }

      const projectsWithCreators = await fetchProjectsWithCreators(apiGet, req);
      const log = loadLog();

      for (const { project, creatorEmail } of projectsWithCreators) {
        await syncProjectCalendarEvents(project, creatorEmail, log);
      }

      saveLog(log);
      console.log(`[CalSync] Sync complete. Processed ${projectsWithCreators.length} projects.`);
    } catch (err) {
      console.error('[CalSync] Poll error:', err.message);
    }
  }

  // Run immediately, then every 30 minutes
  poll();
  pollInterval = setInterval(poll, 30 * 60 * 1000);
}

export function stopCalendarSync() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    console.log('[CalSync] Calendar sync stopped');
  }
}

export { loadLog, saveLog, syncProjectCalendarEvents, fetchProjectsWithCreators };
