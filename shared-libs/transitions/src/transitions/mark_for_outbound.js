const vm = require('vm');

const config = require('../config'),
      db = require('../db'),
      logger = require('../lib/logger');

const CONFIGURED_PUSHES = 'outbound';

const arrayinate = object => Object.keys(object).map(k => {
  object[k].key = k;
  return object[k];
});

const relevantTo = doc => {
  const pushes = arrayinate(config.get(CONFIGURED_PUSHES) || {});

  return pushes.filter(conf => {
    return conf.relevant_to && vm.runInNewContext(conf.relevant_to, {doc});
  });
};

const markForOutbound = (change) => {
  const toQueue = relevantTo(change.doc).map(conf => conf.key);

  if (toQueue) {
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
          type: 'task:outbound',
          created: Date.now(),
          doc_id: change.doc._id,
          queue: toQueue
        });
      })
      .then(() => false);
  }
};

module.exports = {
  filter: change => Object.keys(config.get(CONFIGURED_PUSHES) || {}).length > 0, // eslint-disable-line no-unused-vars
  onMatch: change => Promise.resolve().then(() => markForOutbound(change))
};
