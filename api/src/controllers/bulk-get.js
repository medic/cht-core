const bulkGet = require('../services/bulk-get');

module.exports = {
  request: (req, res) => bulkGet.filterOfflineRequest(req, res)
};
