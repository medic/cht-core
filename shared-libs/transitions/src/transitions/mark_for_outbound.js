const vm = require('vm');

const config = require('../config'),
      db = require('../db'),
      logger = require('../lib/logger');

const CONFIGURED_PUSHES = 'outbound';

const configuredFor = doc => {
  const pushes = config.get(CONFIGURED_PUSHES) || [];

  return pushes.filter(conf => {
    return conf.relevantTo && vm.runInNewContext(conf.relevantTo, {doc: doc});
  });
};

const markForOutbound = (change) => {
  const toQueue = configuredFor(change.doc).map(conf => conf.name);

  return db.sentinel.get(`task:outbound:${change.doc._id}`)
    .then(existingOutboundTask => {
      // TODO: deal with either ignoring or topping up existing queue
      logger.info(`${existingOutboundTask._id} already exists, ignoring`);
    })
    .catch(err => {
      if (err.status !== 404) {
        throw err;
      }

      const taskId = `task:outbound:${change.doc._id}`;

      logger.info(`Creating outbound task ${taskId}`);

      return db.sentinel.put({
        _id: taskId,
        created: Date.now(),
        doc_id: change.doc._id,
        queue: toQueue
      });
    })
    .then(() => false);
};

module.exports = {
  filter: doc => {
    try {
      return configuredFor(doc).length >= 1;
    } catch (err) {
      logger.error(`mark_for_outbound filter failed on ${doc._id} with ${err.message}`);
      return false;
    }
  },
  onMatch: markForOutbound
};
