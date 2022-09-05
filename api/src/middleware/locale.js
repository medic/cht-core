const cookie = require('../services/cookie');

const getAcceptsHeader = (req) => req.headers && req.headers['accept-language'];

module.exports = {
  getLocale: (req, res, next) => {
    if (!req) {
      next();
    }

    req.locale = cookie.get(req, 'locale') || getAcceptsHeader(req);
    next();
  }
};
