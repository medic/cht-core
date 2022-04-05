const serverUtils = require('../server-utils');

module.exports = {
  wantsJSON: (req, res, next) => {
    if (serverUtils.wantsJSON(req)) {
      return next();
    }
    next('route');
  }
};
