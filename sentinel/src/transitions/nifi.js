const { promisify } = require('util'),
      request = require('request'),
      post = promisify(request.post),
      logger = require('../lib/logger'),
      transitionUtils = require('./utils');

const NAME = 'nifi';

module.exports = {
  filter: (doc, info = {}) => !transitionUtils.hasRun(info, NAME),
  onMatch: change => {
    const body = {
      change: change,
    };
    logger.info('POSTing to nifi:\n' + JSON.stringify(body, null, 2));
    return post({
      url: 'http://localhost:9080/contentListener',
      json: true,
      body: body,
    });
  }
};
