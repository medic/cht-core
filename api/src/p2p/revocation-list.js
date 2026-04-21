const auth = require('../auth');
const db = require('../db');
const logger = require('@medic/logger');
const serverUtils = require('../server-utils');

const REVOCATION_DOC_ID = 'p2p-revocation-list';

const EMPTY_REVOCATION_LIST = {
  version: 0,
  revoked_devices: [],
  revoked_users: [],
  updated_at: null,
};

/**
 * Read the P2P revocation list from CouchDB.
 * Returns the data object (without CouchDB metadata).
 */
const getRevocationListData = async () => {
  try {
    const doc = await db.medic.get(REVOCATION_DOC_ID);
    return {
      version: doc.version || 0,
      revoked_devices: doc.revoked_devices || [],
      revoked_users: doc.revoked_users || [],
      updated_at: doc.updated_at || null,
    };
  } catch (err) {
    if (err.status === 404) {
      return EMPTY_REVOCATION_LIST;
    }
    logger.warn('Failed to read P2P revocation list: %o', err);
    throw err;
  }
};

/**
 * GET /api/v1/p2p/revocation-list
 * Returns the current revocation list for P2P devices/users.
 */
const getRevocationList = async (req, res) => {
  try {
    // Verify user is authenticated
    await auth.getUserCtx(req);

    const data = await getRevocationListData();
    res.json(data);
  } catch (err) {
    serverUtils.error(err, req, res);
  }
};

module.exports = {
  getRevocationList,
  getRevocationListData,
};
