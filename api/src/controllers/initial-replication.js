const initialReplication = require('../services/initial-replication');
const serverUtils = require('../server-utils');

module.exports = {
  getDocIds: (req, res) => {
    return initialReplication
      .getInitialReplicationContext(req.userCtx, req.replicationId)
      .then(({ docIds, lastSeq, warn }) => res.json({
        doc_ids: docIds,
        last_seq: lastSeq,
        warn,
      }))
      .catch(err => serverUtils.serverError(err, req, res));
  }
};
