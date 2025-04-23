const environment = require('@medic/environment');

const MAX_HISTORY_LIMIT = 10;

const ignore = [
  'service-worker-meta'
];

const db = {};
let application;
let asyncLocalStorage;

const monitoredPaths = [
  { method: 'POST', path: new RegExp(`/${environment.db}/_bulk_docs/?`), bulk: true },
  { method: 'POST', path: new RegExp(`/${environment.db}/$`) },
  { method: 'PUT', path: new RegExp(`/${environment.db}/(?!.*/)[A-Za-z0-9_]+`) },
];

const initLib = (medicDb, auditDb, app, store) => {
  db.medic = medicDb;
  db.audit = auditDb;
  asyncLocalStorage = store;
  application = app;
};

const isMonitoredUrl = (uri, method) => monitoredPaths.find(
  (monitoredPath) => {
    return method === monitoredPath.method && monitoredPath.path.test(uri);
  }
);
const auditRecord = (body) => {
  if (!body.ok || !body.rev || ignore.includes(body.id)) {
    return;
  }
  return {
    date: new Date(),
    id: body.id,
    rev: body.rev,
  };
};

const getAuditDoc = (auditRecord, rev) => ({
  _id: auditRecord.id,
  _rev: rev,
  history: [],
});

const write = async (auditQueue, requestMetadata) => {
  const ids = auditQueue.map((auditRecord) => auditRecord.id);
  const existingAuditDocs = (await db.audit.allDocs({ keys: ids, include_docs: true }));

  const newAuditDocs = [];

  auditQueue.forEach((audit, idx) => {
    const auditDoc = existingAuditDocs.rows[idx].doc || getAuditDoc(audit);
    if (auditDoc.history.length >= MAX_HISTORY_LIMIT) {
      newAuditDocs.push({ ...auditDoc, _id: `${auditDoc._id}:${new Date().getTime()}`, _rev: undefined });
      auditDoc.history = [];
    }

    auditDoc.history.push({
      rev: audit.rev,
      request_id: requestMetadata?.requestId,
      user: requestMetadata?.user || environment.username,
      date: audit.date,
      application: application,
    });
    newAuditDocs.push(auditDoc);
  });
  await db.audit.bulkDocs(newAuditDocs);
  auditQueue.splice(0, auditQueue.length);
};

const recordAudit = async (body, requestMetadata) => {
  const auditQueue = Array.isArray(body) ? body.map(doc => auditRecord(doc)) : [auditRecord(body)];
  await write(auditQueue, requestMetadata);
};

const prepareBody = (monitoredUrl, requestBody, responseBody) => {
  if (!monitoredUrl.bulk) {
    return responseBody;
  }

  if (typeof requestBody === 'string') {
    requestBody = JSON.parse(requestBody);
  }
  if (requestBody.new_edits === false) {
    return requestBody.docs.map(doc => ({
      id: doc._id,
      rev: doc._rev,
      ok: true
    }));
  }

  return responseBody;
};

const fetchCallback = async (url, opts, response) => {
  if (!response.ok || !response.headers.get('content-type')?.startsWith('application/json')) {
    return;
  }

  const monitoredUrl = isMonitoredUrl(url, opts.method);
  if (!monitoredUrl) {
    return;
  }

  // get metadata early, to avoid promise chain ending before this gets executed
  const requestMetadata = asyncLocalStorage?.getRequest();

  let body;
  if (response.streamed) {
    body = response.body;
  } else {
    const clone = response.clone();
    body = await clone.json();
  }
  body = prepareBody(monitoredUrl, opts.body, body);

  await recordAudit(body, requestMetadata);
};

const expressCallback = async (req, responseBody) => {
  const monitoredUrl = isMonitoredUrl(req.originalUrl, req.method);
  if (!monitoredUrl) {
    return;
  }

  // get metadata early, to avoid promise chain ending before this gets executed
  const requestMetadata = asyncLocalStorage?.getRequest();

  const body = prepareBody(monitoredUrl, req.body, responseBody);
  await recordAudit(body, requestMetadata);
};

module.exports = {
  initLib,
  fetchCallback,
  expressCallback,
};
