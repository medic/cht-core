const service = require('../services/monitoring');
const serverUtils = require('../server-utils');

module.exports = {
  get: (req, res) => {
    const DEFAULT_DAYS = 7;
    let daysAgo = DEFAULT_DAYS;

    if (req.query.connected_user_interval) {
      daysAgo = req.query.connected_user_interval;
    }
    return service.json(daysAgo)
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  }
};
