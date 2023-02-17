const initialReplication = require('../services/initial-replication');
const serverUtils = require('../server-utils');

module.exports = {
  getDocIds: (req, res) => {
    return initialReplication
      .getDocsIds(req.userCtx, req.replicationId)
      .then(results => res.json(results))
      .catch(err => serverUtils.serverError(err, req, res));
  }
};
