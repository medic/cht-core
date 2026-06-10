const replication = require('../services/replication/replication');
const serverUtils = require('../server-utils');
const { ReplicationThrottledError } = require('../services/replication/replication-limit');

module.exports = {
  getDocIds: async (req, res) => {
    try {
      const context = await replication.getContext(req.userCtx);
      const docIdsRevs = await replication.getDocIdsRevPairs(context.docIds);
      return res.json({
        doc_ids_revs: docIdsRevs,
        warn_docs: context.warnDocIds.length,
        last_seq: context.lastSeq,
        warn: context.warn,
        limit: context.limit,
      });
    } catch (err) {
      if (err instanceof ReplicationThrottledError) {
        req.replicationThrottled = true;
      }
      return serverUtils.error(err, req, res);
    }
  },
  getDocIdsToDelete: async (req, res) => {
    const docIds = req.body?.doc_ids;
    try {
      const docIdsToDelete = await replication.getDocIdsToDelete(req.userCtx, docIds);
      return res.json({ doc_ids: docIdsToDelete });
    } catch (err) {
      return serverUtils.serverError(err, req, res);
    }
  },
};
