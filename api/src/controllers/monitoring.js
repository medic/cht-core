const service = require('../services/monitoring');
const serverUtils = require('../server-utils');

const DEFAULT_CONNECTED_USER_INTERVAL = 7;

module.exports = {
  getV1: (req, res) => {
    const connectedUserInterval = req.query.connected_user_interval || DEFAULT_CONNECTED_USER_INTERVAL;

    return service.jsonV1(connectedUserInterval)
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  },
  getV2: (req, res) => {
    const connectedUserInterval = req.query.connected_user_interval || DEFAULT_CONNECTED_USER_INTERVAL;
    
    return service
      .jsonV2(connectedUserInterval)
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  },
};
