const replication = require('../services/replication');
const serverUtils = require('../server-utils');

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
      return serverUtils.serverError(err, req, res);
    }
  },
  getDocIdsToDelete: async (req, res) => {
    const docIdRevs = req.body;

  },
};
