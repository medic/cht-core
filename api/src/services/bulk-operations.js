const db = require('../db');
const { LOG_ID_PREFIX, buildBulkOperation } = require('@medic/bulk-operations');

// Reads only bulk operation log documents from the medic-logs database. The prefix guard keeps the
// endpoint from returning the other kinds of log documents that share this database.
const getLog = async (id) => {
  if (!id?.startsWith(LOG_ID_PREFIX)) {
    return null;
  }

  try {
    const log = await db.medicLogs.get(id);
    delete log._rev;
    return log;
  } catch (err) {
    if (err.status === 404) {
      return null;
    }
    throw err;
  }
};

// Queues a bulk operation: writes the log document to medic-logs (the status record the polling
// endpoint reads) and one action document per action type to medic-sentinel (what the Sentinel
// listener processes). The log is written first so it exists before the listener picks up an action.
// Action groups with no operations are skipped. Returns the bulk operation id.
const queue = async (actionOperations) => {
  const nonEmpty = actionOperations.filter(({ operations }) => operations.length);
  const { log, actions } = buildBulkOperation(nonEmpty, new Date());

  await db.medicLogs.put(log);
  await db.sentinel.bulkDocs(actions);

  return log._id;
};

module.exports = {
  getLog,
  queue,
};
