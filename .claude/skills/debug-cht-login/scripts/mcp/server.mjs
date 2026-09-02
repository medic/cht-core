#!/usr/bin/env node
// cht-debug — zero-dependency MCP stdio server exposing read-only CHT diagnostics.
//
// Requires Node 18+ (built-in fetch). Configuration via environment:
//   CHT_URL     https://example.app.medicmobile.org   (required)
//   ADMIN_USER  admin username                        (required for all tools except instance_health)
//   ADMIN_PASS  admin password                        (required for all tools except instance_health)
//
// Guardrails enforced here, in code, so no client has to be trusted to follow prose:
//   - every tool is a GET; the server cannot modify the instance
//   - password hashes and login tokens are redacted before results reach the model
//   - there is deliberately NO login-test tool: the affected user's password must
//     never pass through the model. The human runs that one check themselves.

const SERVER_INFO = { name: 'cht-debug', version: '1.0.0' };
const FALLBACK_PROTOCOL_VERSION = '2025-06-18';
const REQUEST_TIMEOUT_MS = 30_000;

class UserError extends Error {}

const UNCONFIGURED_HINT =
  'The server itself is running fine — nothing needs to be installed, launched, or fixed. ' +
  'It only lacks configuration: it inherits its environment from the client that spawned it, ' +
  'so the human must export the variable(s) in their terminal BEFORE starting the session, then restart it. ' +
  'Alternatively, continue right now in autonomous mode: set the same variables in your own shell and use curl.';

const baseUrl = () => {
  const url = process.env.CHT_URL;
  if (!url) {
    throw new UserError(`The CHT_URL environment variable is not set on the MCP server. ${UNCONFIGURED_HINT}`);
  }
  return url.replace(/\/+$/, '');
};

const authHeader = () => {
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASS;
  if (!user || !pass) {
    throw new UserError(`ADMIN_USER / ADMIN_PASS environment variables are not set on the MCP server. ${UNCONFIGURED_HINT}`);
  }
  return 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
};

const get = async (path, { auth = true } = {}) => {
  const headers = { Accept: 'application/json' };
  if (auth) {
    headers.Authorization = authHeader();
  }
  let response;
  try {
    response = await fetch(baseUrl() + path, { headers, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  } catch (err) {
    throw new UserError(`Cannot reach ${baseUrl()}${path}: ${err.cause?.message || err.message}`);
  }
  const text = await response.text();
  if (response.status === 404) {
    throw new UserError(
      `404 at ${path} — this endpoint or view does not exist on this CHT version. ` +
      'Skip this check or use the fallback described in the skill.'
    );
  }
  if (!response.ok) {
    throw new UserError(`HTTP ${response.status} at ${path}: ${text.slice(0, 500)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new UserError(`Non-JSON response from ${path} (a proxy error page?): ${text.slice(0, 300)}`);
  }
};

const PASSWORD_HASH_FIELDS = ['derived_key', 'salt', 'password_scheme', 'iterations', 'pbkdf2_prf'];

const redactUserDoc = (doc) => {
  if (!doc || typeof doc !== 'object') {
    return doc;
  }
  const clean = { ...doc };
  for (const field of PASSWORD_HASH_FIELDS) {
    if (field in clean) {
      clean[field] = '<redacted>';
    }
  }
  if (clean.token_login?.token) {
    clean.token_login = { ...clean.token_login, token: '<redacted>' };
  }
  return clean;
};

const asJsonValue = (value) => (typeof value === 'string' ? value : JSON.stringify(value));

const withIsoDate = (doc) =>
  doc && typeof doc.date === 'number' ? { ...doc, date_iso: new Date(doc.date).toISOString() } : doc;

// Mirrors getDepth() in api/src/services/replication/authorization.js: highest depth
// across the user's roles wins; ties take the most permissive replicate_primary_contacts
// and the max report_depth; no matching entry (or no setting at all) = unlimited (-1).
const computeConfiguredDepth = (roles, replicationDepthSettings) => {
  const result = { contact_depth: -1, report_depth: -1, replicate_primary_contacts: false, matched_roles: [] };
  if (!roles?.length || !Array.isArray(replicationDepthSettings)) {
    return result;
  }
  for (const role of roles) {
    const setting = replicationDepthSettings.find((entry) => entry.role === role);
    const depth = Number.parseInt(setting?.depth, 10);
    if (!setting || Number.isNaN(depth)) {
      continue;
    }
    result.matched_roles.push(role);
    const rawReportDepth = Number.parseInt(setting.report_depth, 10);
    const reportDepth = Number.isNaN(rawReportDepth) ? -1 : rawReportDepth;
    if (depth > result.contact_depth) {
      result.contact_depth = depth;
      result.replicate_primary_contacts = !!setting.replicate_primary_contacts;
      result.report_depth = reportDepth;
    } else if (depth === result.contact_depth) {
      result.replicate_primary_contacts = result.replicate_primary_contacts || !!setting.replicate_primary_contacts;
      result.report_depth = Math.max(result.report_depth, reportDepth);
    }
  }
  return result;
};

const TOOLS = [
  {
    name: 'instance_health',
    description:
      'CHT instance health and version (no credentials needed). Returns /api/v2/monitoring: version.app, ' +
      'replication_limit.count (users currently over the 10,000-doc limit) and, on newer CHT, ' +
      'replication_failure.count. Run this first — it also proves the instance is reachable.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler: () => get('/api/v2/monitoring', { auth: false }),
  },
  {
    name: 'get_user_docs',
    description:
      'Fetch both docs that define a CHT user: org.couchdb.user:<name> in the _users database (authentication) ' +
      'and in the medic database (settings). A 404 on either is itself a diagnosis. Inspect roles, facility_id, ' +
      'contact_id, oidc_username, password_change_required, token_login. Password hashes are redacted.',
    inputSchema: {
      type: 'object',
      properties: { username: { type: 'string', description: 'The affected user\'s login name' } },
      required: ['username'],
      additionalProperties: false,
    },
    handler: async ({ username }) => {
      const id = encodeURIComponent(`org.couchdb.user:${username}`);
      const fetchDoc = async (db) => {
        try {
          return redactUserDoc(await get(`/${db}/${id}`));
        } catch (err) {
          return { missing: true, detail: err.message };
        }
      };
      const [users, medic] = await Promise.all([fetchDoc('_users'), fetchDoc('medic')]);
      return { _users: users, medic };
    },
  },
  {
    name: 'get_settings',
    description:
      'Fetch selected top-level keys from the CHT app settings. Defaults to the login/replication suspects: ' +
      'app_url, replication_depth, purge, district_admins_access_unallocated_messages, oidc_provider, token_login. ' +
      'Ask for other keys explicitly (note: "permissions" and "forms" are very large).',
    inputSchema: {
      type: 'object',
      properties: {
        keys: { type: 'array', items: { type: 'string' }, description: 'Top-level settings keys to return' },
      },
      additionalProperties: false,
    },
    handler: async ({ keys }) => {
      const wanted = keys?.length
        ? keys
        : ['app_url', 'replication_depth', 'purge', 'district_admins_access_unallocated_messages', 'oidc_provider', 'token_login'];
      const settings = await get('/api/v1/settings');
      return Object.fromEntries(wanted.map((key) => [key, key in settings ? settings[key] : '<key not present>']));
    },
  },
  {
    name: 'users_info',
    description:
      'Live replication doc count for a role + facility combination — the primary "how big is this user" probe. ' +
      'Returns { total_docs, warn_docs, warn, limit:10000 }; the warning fires on warn_docs. Accepts HYPOTHETICAL ' +
      'combinations without touching any user — use this to bisect by child place or by individual role. The role ' +
      'must be an offline role. Task caveat: tasks are user-scoped and these admin queries name no user, so counts ' +
      'EXCLUDE tasks and understate what the real device downloads — compare users_doc_count (task-inclusive, from ' +
      'the last real sync) to see the task share.',
    inputSchema: {
      type: 'object',
      properties: {
        role: {
          description: 'Offline role name, or array of role names for multi-role users',
          anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
        },
        facility_id: {
          description: 'Place id (or array of place ids) the user is assigned to',
          anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
        },
        contact_id: { type: 'string' },
      },
      required: ['role', 'facility_id'],
      additionalProperties: false,
    },
    handler: ({ role, facility_id: facilityId, contact_id: contactId }) => {
      const params = new URLSearchParams({ role: asJsonValue(role), facility_id: asJsonValue(facilityId) });
      if (contactId) {
        params.set('contact_id', contactId);
      }
      return get(`/api/v1/users-info?${params}`);
    },
  },
  {
    name: 'users_doc_count',
    description:
      'Doc count recorded at a user\'s LAST SUCCESSFUL sync (from the replication-count log). Returns count ' +
      '(post-purge, what the device downloaded), all_docs_count (pre-purge — the gap shows purge effectiveness) ' +
      'and date (last completed sync; date_iso added for readability). No entry means the user never completed a sync. ' +
      'Omit username to list all recorded users.',
    inputSchema: {
      type: 'object',
      properties: { username: { type: 'string' } },
      additionalProperties: false,
    },
    handler: async ({ username }) => {
      const query = username ? `?user=${encodeURIComponent(username)}` : '';
      const result = await get(`/api/v1/users-doc-count${query}`);
      const users = Array.isArray(result.users) ? result.users.map(withIsoDate) : withIsoDate(result.users);
      return { ...result, users };
    },
  },
  {
    name: 'replication_failure_logs',
    description:
      'Per-failure replication log for a user (newer CHT only — a 404 means the version predates it). ' +
      'status_code 0 means the device aborted mid-download: the timeout signature. Also shows duration, ' +
      'docs_count, unpurged_docs_count (null = that phase never completed) and daily_failures counters.',
    inputSchema: {
      type: 'object',
      properties: {
        username: { type: 'string' },
        reporting_period: { type: 'string', description: 'YYYY-MM, defaults to the current month' },
        limit: { type: 'number' },
      },
      required: ['username'],
      additionalProperties: false,
    },
    handler: ({ username, reporting_period: reportingPeriod, limit }) => {
      const params = new URLSearchParams({ user: username });
      if (reportingPeriod) {
        params.set('reporting_period', reportingPeriod);
      }
      if (limit) {
        params.set('limit', String(limit));
      }
      return get(`/api/v1/replication-failure-logs?${params}`);
    },
  },
  {
    name: 'replication_health',
    description:
      'Fleet view: all users with replication failures and no success since (newer CHT only). One affected user ' +
      'suggests a user-specific cause (their place/role); a cohort suggests a config- or data-level cause.',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Window in days, default 30' },
        min_failures: { type: 'number', description: 'Minimum failures to include, default 1' },
      },
      additionalProperties: false,
    },
    handler: ({ days = 30, min_failures: minFailures = 1 }) =>
      get(`/api/v1/replication-health/failed?days=${days}&min_failures=${minFailures}`),
  },
  {
    name: 'find_user_by_oidc',
    description:
      'Find CHT users whose oidc_username matches an identity-provider email claim (SSO branch). Exactly one ' +
      'match is required for SSO login to work; zero or multiple matches is the diagnosis.',
    inputSchema: {
      type: 'object',
      properties: { oidc_username: { type: 'string', description: 'The email claim from the identity provider' } },
      required: ['oidc_username'],
      additionalProperties: false,
    },
    handler: async ({ oidc_username: oidcUsername }) => {
      let users;
      try {
        users = await get('/api/v2/users');
      } catch {
        users = await get('/api/v1/users');
      }
      const needle = oidcUsername.toLowerCase();
      const matches = (Array.isArray(users) ? users : []).filter(
        (user) => typeof user.oidc_username === 'string' && user.oidc_username.toLowerCase() === needle
      );
      return { match_count: matches.length, matches: matches.map(redactUserDoc) };
    },
  },
  {
    name: 'contact_depth_profile',
    description:
      'Contact-volume profile along the EXACT pathway replication uses (the medic/contacts_by_depth view). ' +
      'Computes the user\'s effective replication depth from the replication_depth setting + their roles ' +
      '(highest depth across roles; no entry = unlimited = -1), then returns a per-depth contact histogram with ' +
      'cumulative counts: the cumulative value at depth D is exactly what capping replication_depth at D would ' +
      'replicate. Also reports how many extra people replicate_primary_contacts pulls in from below the cap. ' +
      'Counts contacts only — attribute report/task volume with users_info comparisons.',
    inputSchema: {
      type: 'object',
      properties: {
        facility_id: {
          description: 'The user\'s place id (or array of place ids)',
          anyOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
        },
        roles: {
          type: 'array',
          items: { type: 'string' },
          description: 'The user\'s roles, used to resolve their configured depth from settings',
        },
        probe_depth: { type: 'number', description: 'Deepest level to histogram, default max(configured+2, 6)' },
      },
      required: ['facility_id'],
      additionalProperties: false,
    },
    handler: async ({ facility_id: facilityId, roles = [], probe_depth: probeDepth }) => {
      const facilityIds = Array.isArray(facilityId) ? facilityId : [facilityId];
      const settings = await get('/api/v1/settings');
      const configured = computeConfiguredDepth(roles, settings.replication_depth);
      const maxProbe = Math.min(probeDepth ?? Math.max(configured.contact_depth + 2, 6), 15);

      const queryView = async (keys) => {
        const result = await get(
          `/medic/_design/medic/_view/contacts_by_depth?keys=${encodeURIComponent(JSON.stringify(keys))}`
        );
        return result.rows;
      };
      const histogramKeys = facilityIds.flatMap((id) =>
        Array.from({ length: maxProbe + 1 }, (_, depth) => [id, depth])
      );
      const [depthRows, allRows] = await Promise.all([
        queryView(histogramKeys),
        queryView(facilityIds.map((id) => [id])),
      ]);

      const idsAtDepth = Array.from({ length: maxProbe + 1 }, () => new Set());
      for (const row of depthRows) {
        idsAtDepth[row.key[1]].add(row.id);
      }
      const seen = new Set();
      const histogram = idsAtDepth.map((ids, depth) => {
        ids.forEach((id) => seen.add(id));
        return { depth, contacts: ids.size, cumulative: seen.size };
      });
      const totalUnlimited = new Set(allRows.map((row) => row.id)).size;

      let primaryContactsBelowCap;
      if (configured.contact_depth >= 0) {
        const withinDepth = new Set();
        const primaries = new Set();
        for (const row of depthRows) {
          if (row.key[1] <= configured.contact_depth) {
            withinDepth.add(row.id);
            if (row.value?.primary_contact) {
              primaries.add(row.value.primary_contact);
            }
          }
        }
        primaryContactsBelowCap = [...primaries].filter((id) => !withinDepth.has(id)).length;
      }

      return {
        configured,
        total_contacts_unlimited: totalUnlimited,
        contacts_at_configured_depth:
          configured.contact_depth >= 0
            ? histogram[Math.min(configured.contact_depth, maxProbe)]?.cumulative
            : totalUnlimited,
        histogram,
        ...(primaryContactsBelowCap !== undefined && {
          primary_contacts_added_if_replicate_primary_contacts: primaryContactsBelowCap,
        }),
        note:
          'Counts contacts only, computed the same way replication does. -1 means unlimited. ' +
          'If contacts are a small share of warn_docs (users_info), the volume is reports/tasks.',
      };
    },
  },
];

const send = (message) => process.stdout.write(JSON.stringify(message) + '\n');
const reply = (id, result) => send({ jsonrpc: '2.0', id, result });
const replyError = (id, code, message) => send({ jsonrpc: '2.0', id, error: { code, message } });

const handleMessage = async (message) => {
  const { id, method, params } = message;
  if (!method) {
    return; // a response, not a request — this server never sends requests
  }
  if (method.startsWith('notifications/')) {
    return;
  }
  switch (method) {
    case 'initialize':
      return reply(id, {
        protocolVersion: params?.protocolVersion || FALLBACK_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: SERVER_INFO,
      });
    case 'ping':
      return reply(id, {});
    case 'tools/list':
      return reply(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case 'tools/call': {
      const tool = TOOLS.find((candidate) => candidate.name === params?.name);
      if (!tool) {
        return replyError(id, -32602, `Unknown tool: ${params?.name}`);
      }
      try {
        const result = await tool.handler(params?.arguments || {});
        return reply(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] });
      } catch (err) {
        const text = err instanceof UserError ? err.message : `Unexpected error: ${err.message}`;
        return reply(id, { content: [{ type: 'text', text }], isError: true });
      }
    }
    default:
      if (id !== undefined && id !== null) {
        return replyError(id, -32601, `Method not found: ${method}`);
      }
  }
};

let buffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
  buffer += chunk;
  let newline;
  while ((newline = buffer.indexOf('\n')) >= 0) {
    const line = buffer.slice(0, newline).trim();
    buffer = buffer.slice(newline + 1);
    if (!line) {
      continue;
    }
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      replyError(null, -32700, 'Parse error');
      continue;
    }
    handleMessage(message).catch((err) => {
      if (message.id !== undefined && message.id !== null) {
        replyError(message.id, -32603, err.message);
      }
    });
  }
});
process.stdin.on('end', () => process.exit(0));
