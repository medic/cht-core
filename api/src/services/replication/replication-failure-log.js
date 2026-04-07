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

const getByMonth = async (month) => {
  const prefix = `${LOG_TYPE}-${month}`;
  const result = await db.medicLogs.allDocs({
    startkey: `${prefix}-`,
    endkey: `${prefix}-\ufff0`,
    include_docs: true,
  });
  return result.rows.map(row => row.doc);
};

module.exports = {
  capture: captureFailure,
  getByMonth,
};
