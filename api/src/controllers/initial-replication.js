const initialReplication = require('../services/initial-replication');
const serverUtils = require('../server-utils');

module.exports = {
  getDocIds: async (req, res) => {
    try {
      const context = await initialReplication.getContext(req.userCtx);
      const docIdsRevs = await initialReplication.getDocIdsRevPairs(context.docIds);
      return res.json({
        doc_ids_revs: docIdsRevs,
        warn_docs: context.warnDocIds.length,
        last_seq: context.lastSeq,
        warn: context.warn,
        limit: context.limit,
      });
    } catch (err) {
      return serverUtils.serverError(err, req, res);
    }
  }
};
