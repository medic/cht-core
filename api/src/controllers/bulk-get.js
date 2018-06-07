const bulkGet = require('../services/bulk-get');

module.exports = {
  request: (req, res) => bulkGet.filterRestrictedRequest(req, res)
};
