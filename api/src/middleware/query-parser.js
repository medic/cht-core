module.exports = {
  json: (req, res, next) => {
    req.parsedQuery = req.query ? { ...req.query } : {};

    Object.keys(req.parsedQuery).forEach(key => {
      try {
        req.parsedQuery[key] = JSON.parse(req.parsedQuery[key]);
      } catch {
        // no change
      }
    });

    next();
  }
};
