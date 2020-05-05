const service = require('../services/monitoring');
const serverUtils = require('../server-utils');

module.exports = {
  get: (req, res) => {
    return service.json()
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  }
};
