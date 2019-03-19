const vm = require('vm');

const config = require('../config'),
      logger = require('../lib/logger');

const CONFIGURED_PUSHES = 'outbound';

const configuredFor = doc => {
  return config.get(CONFIGURED_PUSHES).filter(conf => {
    return vm.runInNewContext(conf.relevantTo, {doc: doc});
  });
};

const markForOutbound = doc => {
  // There isn't really currently a better mechanism than just marking a document
  // task and scheduled_task don't really fit this mould (they are all very much around
  // sending SMS that have been compiled from some translatable thing).
  // We could look into reworking the above into a more generic queuing system of which
  // this could be a part, but that would be a larger project.
  doc.outbound_queue = configuredFor(doc).map(conf => conf.name);
  return Promise.resolve(true);
};

module.exports = {
  filter: doc => {
    try {
      return configuredFor(doc);
    } catch (err) {
      logger.error(`mark_for_outbound filter failed on ${doc._id} with`, err);
      return false;
    }
  },
  onMatch: ({doc}) => markForOutbound(doc)
};
