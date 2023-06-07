const serverUtils = require('../server-utils');

const processRequest = () => {
  // todo just send the new service worker!
};

const request = (req, res) => {
  res.type('json');
  return processRequest(req, res).catch(err => serverUtils.error(err, req, res));
};

module.exports = {
  request: request,
};
