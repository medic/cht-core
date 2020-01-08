const vm = require('vm');

const config = require('../config');
const db = require('../db');
const logger = require('../lib/logger');

const CONFIGURED_PUSHES = 'outbound';

const relevantTo = doc => {
  const pushes = config.get(CONFIGURED_PUSHES) || {};

  return Object.keys(pushes).filter(key => {
    const conf = pushes[key];
    return conf.relevant_to && vm.runInNewContext(conf.relevant_to, {doc});
  });
};

const markForOutbound = (change) => {
  const toQueue = relevantTo(change.doc);

  if (toQueue.length) {
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
