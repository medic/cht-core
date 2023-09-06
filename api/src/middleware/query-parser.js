module.exports = {
  json: (req, res, next) => {
    if (!req.query) {
      req.query = {};
    }

    Object.keys(req.query).forEach(key => {
      try {
        req.query[key] = JSON.parse(req.query[key]);
      } catch (e) {
        // no change
      }
    });

    next();
  }
};
