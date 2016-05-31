/**
 * This module implements GET and POST to support medic-gateway's API
 * @see https://github.com/medic/medic-gateway
 */

var _ = require('underscore'),
    messageUtils = require('./messages'),
    recordUtils = require('./records');

function warn() {
  var args = Array.prototype.slice.call(arguments, 0);
  args.unshift('WARN', 'sms-gateway');
  console.error.apply(console, args);
}

function readBody(stream) {
  var body = '';
  return new Promise(function(resolve, reject) {
    stream.on('data', function(data) {
      body += data.toString();
    });
    stream.on('end', function() {
      resolve(body);
    });
    stream.on('error', reject);
  });
}

function saveToDb(gatewayRequest, wtMessage) {
  var messageBody = {
    from: wtMessage.from,
    message: wtMessage.content,
    gateway_ref: wtMessage.id,
  };

  return new Promise(function(resolve, reject) {
    recordUtils.create(messageBody, function(err) {
      if (err) {
        return reject(err);
      }
      resolve();
    });
  });
}

function getWebappState(update) {
  switch(update.status) {
    case 'SENT':
      return 'sent';
    case 'DELIVERED':
      return 'delivered';
    case 'FAILED':
      return 'failed';
  }
}

function updateStateFor(update) {
  var newState = getWebappState(update);
  if (!newState) {
    return Promise.reject(new Error('Could not work out new state for update: ' + JSON.stringify(update)));
  }

  if (update.status === 'FAILED' && update.reason) {
    return updateState(update.id, newState, update.reason);
  }

  return updateState(update.id, newState);
}

function updateState(messageId, newState, failureReason) {
  var updateBody = {
    state: newState,
  };

  if (failureReason) {
    updateBody.details = { reason:failureReason };
  }

  return new Promise(function(resolve, reject) {
    messageUtils.updateMessage(messageId, updateBody, function(err) {
      if (err) {
        return reject(err);
      }
      return resolve();
    });
  });
}

function getWebappOriginatingMessages() {
  return new Promise(function(resolve) {
    var opts = { state: 'pending' };
    messageUtils.getMessages(opts, function(err, pendingMessages) {
      var woMessages = { docs: [], outgoingPayload: [] };

      if (err) {
        warn(err);
        return resolve(woMessages);
      }

      _.each(pendingMessages, function(pendingMessage) {
        woMessages.docs.push(pendingMessage);
        woMessages.outgoingPayload.push({
          id: pendingMessage.id,
          to: pendingMessage.to,
          content: pendingMessage.message,
        });
      });
      resolve(woMessages);
    });
  });
}

module.exports = {
  get: function(options, callback) {
    callback(null, { 'medic-gateway': true });
  },
  post: function(req, callback) {
    readBody(req)
      .then(JSON.parse)
      .then(function(request) {
        // Process webapp-terminating messages asynchronously
        Promise.resolve()
          .then(function() {
            if(request.messages) {
              _.forEach(request.messages, function(webappTerminatingMessage) {
                saveToDb(req, webappTerminatingMessage)
                  .catch(warn);
              });
            }
          })
          .catch(warn);

        // Process WO message status updates asynchronously
        Promise.resolve()
          .then(function() {
            if(request.updates) {
              _.forEach(request.updates, function(update) {
                updateStateFor(update)
                  .catch(warn);
              });
            }
          })
          .catch(warn);
      })
      .then(getWebappOriginatingMessages)
      .then(function(woMessages) {
        callback(null, { messages: woMessages.outgoingPayload });
        _.forEach(woMessages.docs, function(doc) {
          updateState(doc.id, 'scheduled')
            .catch(warn);
        });
      })
      .catch(callback);
  },
};
