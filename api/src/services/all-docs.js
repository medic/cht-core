const db = require('../db');
const authorization = require('./authorization');
const _ = require('lodash');

const startKeyParams = ['startkey', 'start_key', 'startkey_docid', 'start_key_doc_id'];
const endKeyParams = ['endkey', 'end_key', 'endkey_docid', 'end_key_doc_id'];
const skipParams = ['skip', 'limit'];

module.exports = {
  // offline users will only receive results for documents they are allowed to see
  // mimics CouchDB response format, stubbing forbidden docs when specific `keys` are requested
  filterOfflineRequest: async (userCtx, query) => {
    const allowedIds = authorization.getDefaultDocs(userCtx);
    const options = _.defaults(
      { keys: allowedIds },
      _.omit(query, 'key', ...skipParams, ...startKeyParams, ...endKeyParams)
    );
    return await db.medic.allDocs(options);
  }
};
