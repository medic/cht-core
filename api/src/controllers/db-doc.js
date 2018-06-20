const dbDoc = require('../services/db-doc');

module.exports = {
  request: (req, res, next) => {
    if (!dbDoc.isValidRequest(req.method, req.params.docId, req.body)) {
      return next('route');
    }

    return dbDoc.filterOfflineRequest(req, res, next);
  }
};
