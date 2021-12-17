const taskUtils = require('@medic/task-utils');
const phoneNumber = require('@medic/phone-number');
const db = require('../db');
const logger = require('../logger');
const config = require('../config');
const africasTalking = require('./africas-talking');
const rapidPro = require('./rapidpro');
const records = require('../services/records');
const environment = require('../environment');

// Check DB for messages every minute
// when e2e testing, check every second
const DB_CHECKING_INTERVAL = environment.isTesting ? 1000 : 1000 * 60;
const SMS_SENDING_SERVICES = {
  'africas-talking': africasTalking,
  'rapidpro': rapidPro,
  // medic-gateway -- ignored because it's a pull not a push service
};
const DEFAULT_CONFIG = { outgoing_service: 'medic-gateway' };

const getTaskFromMessage = (tasks, uuid) => {
  return tasks && tasks.find(task => {
    return task.messages && task.messages.find(message => uuid === message.uuid);
  });
};

const getTaskForMessage = (uuid, doc) => {
  return getTaskFromMessage(doc.tasks, uuid) ||
         getTaskFromMessage(doc.scheduled_tasks, uuid);
};

const getTaskAndDocForMessage = (messageId, docs) => {
  for (const doc of docs) {
    const task = getTaskForMessage(messageId, doc);
    if (task) {
      return { task: task, docId: doc._id };
    }
  }
  return {};
};

/*
 * Applies (in-place) state changes to a given collection of docs.
 *
 * Also returns a map of docId -> taskStateChanges
*/
const applyTaskStateChangesToDocs = (taskStateChanges, docs) => {
  return taskStateChanges.reduce((memo, change) => {
    if (!change.messageId) {
      logger.error(`Message id required: ${JSON.stringify(change)}`);
    } else {
      const { task, docId } = getTaskAndDocForMessage(change.messageId, docs);
      if (!task) {
        logger.error(`Message not found: ${change.messageId}`);
      } else {
        if (taskUtils.setTaskState(task, change.state, change.details, change.gatewayRef)) {
          if (!memo[docId]) {
            memo[docId] = [];
          }
          memo[docId].push(change);
        }
      }
    }
    return memo;
  }, {});
};

const getConfig = () => config.get('sms') || DEFAULT_CONFIG;

const getOutgoingMessageService = () => {
  const config = getConfig();
  return config.outgoing_service &&
         SMS_SENDING_SERVICES[config.outgoing_service];
};

const checkDbForMessagesToSend = () => {
  logger.debug('Checking for a configured outgoing message service');
  const service = getOutgoingMessageService();
  if (!service) {
    return Promise.resolve();
  }
  logger.debug('Checking for pending outgoing messages');
  return module.exports
    .getOutgoingMessages()
    .then(messages => {
      logger.info(`Sending ${messages.length} messages`);
      if (!messages.length) {
        return;
      }
      return sendMessages(service, messages);
    })
    .catch(err => logger.error('Error sending outgoing messages: %o', err));
};

const checkDbForMessagesToUpdate = () => {
  const service = getOutgoingMessageService();
  if (!service || !service.poll) {
    return Promise.resolve();
  }

  return service.poll();
};


const getPendingMessages = doc => {
  const tasks = [].concat(doc.tasks || [], doc.scheduled_tasks || []);
  return tasks.reduce((memo, task) => {
    if (task.messages) {
      task.messages.forEach(msg => {
        if (
          msg.uuid &&
          msg.to &&
          msg.message &&
          (task.state === 'pending' || task.state === 'forwarded-to-gateway')
        ) {
          memo.push({
            content: msg.message,
            to: msg.to,
            id: msg.uuid,
          });
        }
      });
    }
    return memo;
  }, []);
};

const sendMessages = (service, messages) => {
  if (!messages.length) {
    return;
  }
  return service
    .send(messages)
    .then(statusUpdates => module.exports.updateMessageTaskStates(statusUpdates));
};

const validateRequiredFields = messages => {
  const requiredFields = [ 'id', 'content', 'from' ];
  return messages.filter(message => {
    return requiredFields.every(field => {
      if (!message[field]) {
        logger.warn(`Message missing required field "${field}": ${JSON.stringify(message)}`);
        return false;
      }
      return true;
    });
  });
};

const removeDuplicateMessages = messages => {
  if (!messages.length) {
    return Promise.resolve([]);
  }
  const keys = messages.map(message => message.id);
  return db.medic.query('medic-sms/messages_by_gateway_ref', { keys })
    .then(res => res.rows.map(row => row.key))
    .then(seenIds => messages.filter(message => {
      if (seenIds.includes(message.id)) {
        logger.info(`Ignoring message (ID already seen): "${message.id}"`);
        return false;
      }
      return true;
    }));
};

const validateIncomingMessages = messages => {
  return removeDuplicateMessages(validateRequiredFields(messages));
};

const createDocs = messages => {
  if (!messages.length) {
    return [];
  }
  const docs = messages.map(message => records.createByForm({
    from: message.from,
    message: message.content,
    gateway_ref: message.id,
  }));
  return config.getTransitionsLib().processDocs(docs);
};

const resolveMissingUuids = changes => {
  const gatewayRefs = changes
    .map(change => !change.messageId && change.gatewayRef)
    .filter(ref => ref);
  if (!gatewayRefs.length) {
    // all messages have ids
    return Promise.resolve();
  }
  return db.medic.query('medic-sms/messages_by_gateway_ref', { keys: gatewayRefs }).then(res => {
    res.rows.forEach(({ key, value }) => {
      const change = changes.find(({ gatewayRef }) => gatewayRef === key);
      if (change) {
        change.messageId = value;
      }
    });
  });
};

const countStateChanges = (results, stateChangesByDocId) => {
  let count = 0;
  results.forEach(result => count += stateChangesByDocId[result.id].length);
  return count;
};

module.exports = {
  getOutgoingMessageService: getOutgoingMessageService,
  /**
   * Sends pending messages on the doc with the given ID using the
   * configured outgoing message service.
   */
  send: docId => {
    const service = getOutgoingMessageService();
    if (!service) {
      return Promise.resolve();
    }
    return db.medic.get(docId).then(doc => {
      return sendMessages(service, getPendingMessages(doc));
    });
  },

  /**
   * Stores incoming messages in the database.
   * @param messages an array of message objects with properties
   *    - id: unique gateway reference used to prevent double handling
   *    - from: the phone number of the original sender
   *    - content: the string message
   * Returns a Promise to resolve an object with the number of
   *    messages saved to the database.
   */
  processIncomingMessages: (messages=[]) => {
    return validateIncomingMessages(messages)
      .then(messages => createDocs(messages))
      .then(results => {
        const allOk = results.every(result => result.ok);
        if (!allOk) {
          logger.error('Failed saving all the new docs: %o', results);
          throw new Error('Failed saving all the new docs');
        }
        return { saved: results.length };
      });
  },

  /**
   * Returns a Promise which resolves the first 25 messages in either
   * "pending" or "forwarded-to-gateway" state.
   */
  getOutgoingMessages: () => {
    const viewOptions = {
      limit: 25,
      startkey: [ 'pending-or-forwarded', 0 ],
      endkey: [ 'pending-or-forwarded', '\ufff0' ],
    };
    return db.medic.query('medic/messages_by_state', viewOptions)
      .then(response => response.rows.map(row => {
        if (row.value.to) {
          const normalized = phoneNumber.normalize(config.get(), row.value.to);
          if (normalized) {
            row.value.to = normalized;
          }
        }
        return row.value;
      }));
  },
  /*
   * taskStateChanges: an Array of objects with
   *   - messageId (optional, if gateway_ref provided)
   *   - gatewayRef (optional, if messageId provided)
   *   - state
   *   - details (optional)
   *
   * Returns a Promise to resolve an object with the number of
   *    tasks saved to the database.
   *
   * These state updates are prone to failing due to update conflicts, so this
   * function will retry up to three times for any updates which fail.
   */
  updateMessageTaskStates: (taskStateChanges, retriesLeft=3, successCount=0) => {
    if (!taskStateChanges.length) {
      return Promise.resolve({ saved: 0 });
    }

    return resolveMissingUuids(taskStateChanges)
      .then(() => {
        const keys = taskStateChanges.map(change => change.messageId);
        return db.medic.query('medic-sms/messages_by_uuid', { keys });
      })
      .then(results => {
        const uniqueIds = [...new Set(results.rows.map(row => row.id))];
        return db.medic.allDocs({ keys: uniqueIds, include_docs: true });
      })
      .then(results => {
        const docs = results.rows.map(r => r.doc);
        const stateChangesByDocId = applyTaskStateChangesToDocs(taskStateChanges, docs);
        const updated = docs.filter(doc => stateChangesByDocId[doc._id] && stateChangesByDocId[doc._id].length);

        if (!updated.length) {
          // nothing to update
          return { saved: successCount };
        }
        return db.medic.bulkDocs(updated).then(results => {
          const failures = results.filter(result => !result.ok);
          const successes = results.filter(result => result.ok);
          successCount += countStateChanges(successes, stateChangesByDocId) -
                          countStateChanges(failures, stateChangesByDocId);
          if (!failures.length) {
            // all successful
            return { saved: successCount };
          }

          if (!retriesLeft) {
            // at least one failed and we've run out of retries - give up!
            return Promise.reject(new Error(`Failed to updateMessageTaskStates: ${JSON.stringify(failures)}`));
          }

          logger.warn(
            `Problems with updateMessageTaskStates: ${JSON.stringify(failures)}\nRetrying ${retriesLeft} more times.`
          );

          const relevantChanges = [];
          failures.forEach(failure => {
            relevantChanges.push(...stateChangesByDocId[failure.id]);
          });
          return module.exports.updateMessageTaskStates(relevantChanges, --retriesLeft, successCount);
        });
      });
  },
  /**
   * Returns true if the configured outgoing messaging service is set
   * to "medic-gateway". We don't want to get into the situation of
   * two services sending the same message.
   */
  isMedicGatewayEnabled: () => {
    return getConfig().outgoing_service === 'medic-gateway';
  }

};

if (!process.env.UNIT_TEST_ENV) {
  setInterval(checkDbForMessagesToSend, DB_CHECKING_INTERVAL);
  setInterval(checkDbForMessagesToUpdate, DB_CHECKING_INTERVAL);
}
