/**
 * This module implements GET and POST to support medic-gateway's API
 * @see https://github.com/medic/medic-gateway
 */

const _ = require('underscore'),
      async = require('async'),
      messageUtils = require('./message-utils'),
      recordUtils = require('./record-utils'),

      // map from the medic-gateway state to the medic-webapp state
      STATUS_MAP = {
        UNSENT: 'received-by-gateway',
        PENDING: 'forwarded-by-gateway',
        SENT: 'sent',
        DELIVERED: 'delivered',
        FAILED: 'failed',
      };

function warn() {
  const args = Array.prototype.slice.call(arguments, 0);
  args.unshift('WARN', 'sms-gateway');
  console.error.apply(console, args);
}

function saveToDb(message, callback) {
  recordUtils.createByForm({
    from: message.from,
    message: message.content,
    gateway_ref: message.id,
  }, callback);
}

function updateStateFor(update, callback) {
  let details,
      newState = STATUS_MAP[update.status];
  if (newState) {
    if(update.reason) {
      details = { reason: update.reason };
    }
  } else {
    newState = 'unrecognised';
    details = { gateway_status: update.status };
  }
  updateState(update.id, newState, details, callback);
}

function updateState(messageId, newState, details, callback) {
  const updateBody = {
    state: newState,
  };
  if(details) {
    updateBody.details = details;
  }
  messageUtils.updateMessage(messageId, updateBody, callback);
}

function markMessagesForwarded(messages, callback) {
  async.eachSeries(
    messages,
    (message, callback) => updateState(message.id, 'forwarded-to-gateway', null, callback),
    (err) => {
      if (err) {
        // TODO: this comment (and the action of warning) is not correct. What
        //       should we really do here?

        // No error throwing here, because no big deal : 'forwarded-to-gateway' status
        // wasn't saved to DB, so message will stay in 'pending' status and be retried next time.
        warn(err);
      }
      return callback();
    }
  );
}

function getOutgoing(callback) {
  messageUtils.getMessages({ states: ['pending', 'forwarded-to-gateway'] },
    (err, pendingMessages) => {
      if (err) {
        warn(err);
        return callback(null, []);
      }
      const messages = pendingMessages.map(message => {
        return {
          id: message.id,
          to: message.to,
          content: message.message,
        };
      });
      markMessagesForwarded(messages, () => callback(null, messages));
  });
}

// Process webapp-terminating messages
function processMessages(req, callback) {
  if (!req.body.messages) {
    return callback();
  }

  async.eachSeries(req.body.messages, saveToDb, err => {
    if (err) {
      warn(err);
    }
    callback();
  });
}

// Process message status updates
function processUpdates(req, callback) {
  if (!req.body.updates) {
    return callback();
  }
  async.eachSeries(req.body.updates, updateStateFor, err => {
    if (err) {
      warn(err);
    }
    callback();
  });
}

module.exports = {
  get: function(callback) {
    callback(null, { 'medic-gateway': true });
  },
  post: function(req, callback) {
    async.series([
      _.partial(processMessages, req),
      _.partial(processUpdates, req),
      getOutgoing
    ], (err, [,,outgoingMessages]) => {
      if (err) {
        return callback(err);
      }
      callback(null, { messages: outgoingMessages });
    });
  },
};
