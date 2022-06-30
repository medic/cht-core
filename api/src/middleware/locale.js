module.exports = {
  getLocale: (req, res, next) => {
    req.locale = req && req.headers && req.headers['accept-language'];
    next();
  }
};
