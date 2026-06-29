const db = require('../db');
const { LOG_ID_PREFIX } = require('@medic/bulk-operations');

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

module.exports = {
  getLog,
};
