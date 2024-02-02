const service = require('../services/impact-metrics');
const serverUtils = require('../server-utils');

module.exports = {
  get: (req, res) => {
    // TODO check secret setting to disable unless has permission
    return service.get()
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  },
};
