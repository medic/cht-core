const logger = require('../logger');

module.exports = {
  deprecate: (replacement) => {
    return (req, res, next) => {
      const message = `${req.path} is deprecated.${replacement ? ` Please use ${replacement} instead.`: ''}`;
      logger.warn(message);
      next();
    };
  },
};
