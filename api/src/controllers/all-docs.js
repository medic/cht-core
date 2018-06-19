const allDocs = require('../services/all-docs');

module.exports = {
  request: (req, res) => allDocs.filterOfflineRequest(req, res)
};
