/**
 * NB: THIS IS A SPIKE AND MUST NOT BE MERGED INTO MASTER.
 * No consideration has been given to edge cases or performance
 * and no tests have been written.
 */
const { promisify } = require('util'),
      request = require('request'),
      post = promisify(request.post),
      logger = require('../lib/logger'),
      config = require('../config'),
      transitionUtils = require('./utils');

const NAME = 'nifi';

const getNifiUrl = () => {
  const nifi = config.get('nifi');
  return nifi && nifi.url;
};

module.exports = {
  init: () => {
    if (!getNifiUrl()) {
      throw new Error('You must configure the nifi_url to use this transition, eg: { nifi: { url: "http://localhost:9080/contentListener" } }');
    };
  },
  filter: (doc, info = {}) => !transitionUtils.hasRun(info, NAME),
  onMatch: change => {
    const body = {
      change: change, // TODO hydrate contact?
    };
    const url = getNifiUrl();
    logger.info(`POSTing to nifi at "${url}":\n${JSON.stringify(body, null, 2)}`);
    return post({
      url: url,
      json: true,
      body: body,
    });
  }
};

