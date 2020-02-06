const service = require('../services/monitoring');
const serverUtils = require('../server-utils');

const getData = (req, res) => {
  if (req.query.format === 'openmetrics') {
    return service.openMetrics().then(body => res.end(body));
  }
  return service.json().then(body => res.json(body));
};

module.exports = {
  get: (req, res) => {
    return getData(req, res)
      .catch(err => serverUtils.error(err, req, res));
  }
};
