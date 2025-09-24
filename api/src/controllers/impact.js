const service = require('../services/impact');
const serverUtils = require('../server-utils');

module.exports = {
  getV1: (req, res) => {    
    return service.jsonV1()
      .then(body => res.json(body))
      .catch(err => serverUtils.error(err, req, res));
  }
};
