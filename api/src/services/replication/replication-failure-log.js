const db = require('../../db');
const moment = require('moment');

const LOG_TYPE = 'replication-fail';
const MAX_FAILURES = 50;

const captureFailure = async (userCtx, requestId, statusCode, duration) => {
  const log = await getLog(userCtx.name);

  const failure = {
    timestamp: moment().valueOf(),
    status_code: statusCode,
    duration: duration,
    request_id: requestId,
    subjects_count: userCtx.subjectsCount,
    roles: userCtx.roles,
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
        type: LOG_TYPE,
        user: userName,
        timestamp: moment().valueOf(),
        total_failures: 0,
        failures: [],
      };
    }
    throw err;
  }
};

const getSummariesByMonth = async (month) => {
  const prefix = `${LOG_TYPE}-${month}-`;
  const result = await db.medicLogs.allDocs({
    startkey: prefix,
    endkey: `${prefix}\ufff0`,
  });
  return result.rows.map(row => ({
    _id: row.id,
    user: row.id.substring(prefix.length),
    // to avoid a heavy endpoint, don't read doc bodies and extrapolate failure count via rev number
    total_failures: Number.parseInt(row.value.rev.split('-')[0], 10),
  }));
};

const getForUserAndMonth = async (month, userName) => {
  const docId = `${LOG_TYPE}-${month}-${userName}`;
  try {
    return await db.medicLogs.get(docId);
  } catch (err) {
    if (err.status !== 404) {
      throw err;
    }
    return null;
  }
};

const getAllForUser = async (userName) => {
  const typePrefix = `${LOG_TYPE}-`;
  const index = await db.medicLogs.allDocs({
    startkey: typePrefix,
    endkey: `${typePrefix}\ufff0`,
  });

  // _id format: `replication-fail-YYYY-MM-<userName>`; `YYYY-MM-` is always 8 chars after the type prefix
  const MONTH_SEGMENT_LENGTH = 8;
  const matchingIds = index.rows
    .filter(row => row.id.substring(typePrefix.length + MONTH_SEGMENT_LENGTH) === userName)
    .map(row => row.id);

  if (!matchingIds.length) {
    return [];
  }

  const result = await db.medicLogs.allDocs({ keys: matchingIds, include_docs: true });
  return result.rows.map(row => row.doc);
};

module.exports = {
  capture: captureFailure,
  getSummariesByMonth,
  getForUserAndMonth,
  getAllForUser,
};
