const db = require('../../db');
const moment = require('moment');
const { InvalidArgumentError } = require('@medic/cht-datasource');

const LOG_TYPE = 'replication-fail';
const MAX_FAILURES = 50;
const DEFAULT_LIMIT = 100;
// Reporting-period segment `YYYY-MM-` after the type prefix
const REPORTING_PERIOD_SEGMENT_LENGTH = 8;

const validateCursor = (cursor) => {
  if (cursor === undefined || cursor === null) {
    return 0;
  }
  if (typeof cursor !== 'string') {
    throw new InvalidArgumentError(
      `The cursor must be a string or null for first page: [${JSON.stringify(cursor)}].`
    );
  }
  const skip = Number(cursor);
  if (!Number.isInteger(skip) || skip < 0) {
    throw new InvalidArgumentError(
      `The cursor must be a string or null for first page: [${JSON.stringify(cursor)}].`
    );
  }
  return skip;
};

const captureFailure = async (userCtx, requestId, statusCode, duration) => {
  const log = await getLog(userCtx.name);

  // Counts are only set on userCtx as each phase of the request completes. When a count is missing
  // we record 'unknown' instead of omitting the key, so a stable shape on the failure entry tells you
  // (by which counters are 'unknown') how far the request progressed before failing.
  const failure = {
    date: moment().valueOf(),
    status_code: statusCode,
    duration: duration,
    request_id: requestId,
    roles: userCtx.roles,
    subjects_count: userCtx.subjectsCount ?? 'unknown',
    docs_count: userCtx.docsCount ?? 'unknown',
    unpurged_docs_count: userCtx.unpurgedDocsCount ?? 'unknown',
  };

  log.failures.push(failure);
  log.total_failures++;
  if (log.failures.length > MAX_FAILURES) {
    log.failures = log.failures.slice(-MAX_FAILURES);
  }

  return db.medicLogs.put(log);
};

const getDocId = (userName) => `${LOG_TYPE}-${moment().format('YYYY-MM')}-${userName}`;

const getLog = async (userName) => {
  const docId = getDocId(userName);

  try {
    return await db.medicLogs.get(docId);
  } catch (err) {
    if (err.status === 404) {
      return {
        _id: docId,
        user: userName,
        date: moment().valueOf(),
        total_failures: 0,
        failures: [],
      };
    }
    throw err;
  }
};

const getOne = async (docId) => {
  try {
    return await db.medicLogs.get(docId);
  } catch (err) {
    if (err.status === 404) {
      return null;
    }
    throw err;
  }
};

// Returns full failure log documents matching the given filters as a paginated `Page<Log>`:
//   { data: Log[], cursor: string|null }
// `cursor` is an opaque token (currently a stringified skip offset) that callers pass back to fetch
// the next page; `null` means there are no more pages.
// - user + reportingPeriod → single doc lookup (always one page, cursor = null)
// - otherwise: list matching ids, paginate, bulk-fetch the page's bodies
const get = async ({ user, reportingPeriod, cursor, limit = DEFAULT_LIMIT } = {}) => {
  const skip = validateCursor(cursor);

  if (user && reportingPeriod) {
    const doc = await getOne(`${LOG_TYPE}-${reportingPeriod}-${user}`);
    return { data: doc ? [doc] : [], cursor: null };
  }

  const typePrefix = `${LOG_TYPE}-`;
  const prefix = reportingPeriod ? `${typePrefix}${reportingPeriod}-` : typePrefix;

  const index = await db.medicLogs.allDocs({
    startkey: prefix,
    endkey: `${prefix}\ufff0`,
  });

  let ids = index.rows.map(row => row.id);
  if (user) {
    ids = ids.filter(id => id.substring(typePrefix.length + REPORTING_PERIOD_SEGMENT_LENGTH) === user);
  }

  const pageIds = ids.slice(skip, skip + limit);
  const nextSkip = skip + pageIds.length;
  const nextCursor = nextSkip < ids.length ? String(nextSkip) : null;

  if (!pageIds.length) {
    return { data: [], cursor: null };
  }

  const result = await db.medicLogs.allDocs({ keys: pageIds, include_docs: true });
  return { data: result.rows.map(row => row.doc), cursor: nextCursor };
};

module.exports = {
  capture: captureFailure,
  get,
  DEFAULT_LIMIT,
};
