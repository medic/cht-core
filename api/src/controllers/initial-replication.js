const initialReplication = require('../services/initial-replication');
const serverUtils = require('../server-utils');

module.exports = {
  request: (req, res) => {
    return initialReplication
      .getDocs(req.userCtx, req.replicationId)
      .then(results => res.json(results))
      .catch(err => serverUtils.serverError(err, req, res));
  }
};
