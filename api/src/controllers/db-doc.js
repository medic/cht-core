const dbDoc = require('../services/db-doc');

module.exports = {
  requestDoc: (req, res, next) => {
    if (!dbDoc.isValidRequest(req.method, req.params.docId, req.body)) {
      return next('route');
    }

    return dbDoc.filterRestrictedRequest(req, res, next);
  },

  requestAttachment: (req, res, next) => dbDoc.filterRestrictedRequest(req, res, next, true)
};
