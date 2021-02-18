const utils = require('../../utils');

const getApiSmsChanges = (messages) => {
  const expectedMessages = messages.map(message => message.content);
  const changes = [];
  const ids = [];
  const listener = utils.db.changes({
    live: true,
    include_docs: true,
    since: 'now'
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      // if we don't get the docs in 5 seconds, cancel
      listener.cancel();
      reject('timeout expired');
    }, 5000);

    listener.on('change', change => {
      if (change.doc.sms_message) {
        if (ids.includes(change.id)) {
          return;
        }
        const idx = expectedMessages.findIndex(message => message === change.doc.sms_message.message);
        changes.push(change);
        expectedMessages.splice(idx, 1);

        ids.push(change.id);
        if (!expectedMessages.length) {
          listener.cancel();
          clearTimeout(timeout);
          resolve(changes);
        }
      }
    });
  });
};

module.exports = {
  getApiSmsChanges
};
