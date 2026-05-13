const db = require('../../db');
const moment = require('moment');
const pagination = require('../pagination');

const TYPE_PREFIX = `replication-fail-`;
const MAX_FAILURES = 50;
const REPORTING_PERIOD_FORMAT = 'YYYY-MM';
const UNKNOWN = 'unknown';
const MAX_PERIODS = 60;

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
    subjects_count: userCtx.subjectsCount ?? UNKNOWN,
    docs_count: userCtx.docsCount ?? UNKNOWN,
    unpurged_docs_count: userCtx.unpurgedDocsCount ?? UNKNOWN,
  };

  log.failures.push(failure);
  log.total_failures++;
  if (log.failures.length > MAX_FAILURES) {
    log.failures = log.failures.slice(-MAX_FAILURES);
  }

  return db.medicLogs.put(log);
};

const getDocId = (userName, reportingPeriod) => {
  if (!reportingPeriod) {
    reportingPeriod = moment().format(REPORTING_PERIOD_FORMAT);
  }
  return `${TYPE_PREFIX}${reportingPeriod}-${userName}`;
};

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

const getRangeForReportingPeriod = (reportingPeriod) => {
  const prefix = reportingPeriod ? `${TYPE_PREFIX}${reportingPeriod}-` : TYPE_PREFIX;
  return { startkey: prefix, endkey: `${prefix}\ufff0` };
};

const enumerateReportingPeriods = () => {
  const MONTH = 'month';
  const now = moment();
  const cursor = now.clone().subtract(MAX_PERIODS, MONTH);

  const periods = [];
  while (cursor.isSameOrBefore(now, MONTH)) {
    periods.push(cursor.format(REPORTING_PERIOD_FORMAT));
    cursor.add(1, MONTH);
  }
  return periods;
};

const getSingleDoc = async (user, reportingPeriod) => {
  const doc = await getOne(getDocId(user, reportingPeriod));
  return {
    data: doc ? [doc] : [],
    cursor: null,
  };
};

const getPageByRange = async ({ reportingPeriod, skip, limit }) => {
  // Fetch `limit + 1` rows and use the trailing row as a definitive "is there a next page?" signal —
  // a `data.length === limit` heuristic would over-report when the total is an exact multiple of limit.
  const result = await db.medicLogs.allDocs({
    ...getRangeForReportingPeriod(reportingPeriod),
    skip,
    limit: limit + 1,
    include_docs: true,
  });
  const hasMore = result.rows.length > limit;
  const data = (hasMore ? result.rows.slice(0, limit) : result.rows).map(row => row.doc);
  return {
    data,
    cursor: pagination.buildNextCursor(skip, data.length, hasMore),
  };
};

const getPageByUser = async ({ user, skip, limit }) => {
  const candidateKeys = enumerateReportingPeriods().map(period => getDocId(user, period));
  const result = await db.medicLogs.allDocs({ keys: candidateKeys, include_docs: true });
  const matched = result.rows.filter(row => row.doc).map(row => row.doc);
  const pageData = matched.slice(skip, skip + limit);

  return {
    data: pageData,
    cursor: pagination.buildNextCursor(skip, pageData.length, skip + pageData.length < matched.length),
  };
};

/**
 * Returns a page of full replication failure log documents matching the given filters.
 *
 * Callers must validate `cursor` and `limit` before invocation (see services/pagination). `cursor`
 * here is the parsed skip offset (the numeric form of the opaque cursor token returned by previous
 * calls); the function still returns a stringified next-cursor in the response.
 *
 * @param {object} [options]
 * @param {string} [options.user] filter to a specific username
 * @param {string} [options.reportingPeriod] filter to a YYYY-MM reporting period
 * @param {number} [options.cursor=0] parsed cursor (skip offset); 0 for the first page
 * @param {number} [options.limit=pagination.DEFAULT_LIMIT] page size
 * @returns {Promise<{ data: object[], cursor: string|null }>} `cursor` is the token to fetch the
 *   next page, or `null` when the current page is the last.
 */
const get = async ({ user, reportingPeriod, cursor = 0, limit = pagination.DEFAULT_LIMIT } = {}) => {
  if (user && reportingPeriod) {
    return getSingleDoc(user, reportingPeriod);
  }
  if (user) {
    return getPageByUser({ user, skip: cursor, limit });
  }
  return getPageByRange({ reportingPeriod, skip: cursor, limit });
};

module.exports = {
  capture: captureFailure,
  get,
};
