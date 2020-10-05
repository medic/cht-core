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

  return new Promise(resolve => {
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
          resolve(changes);
        }
      }
    });
  });
};

module.exports = {
  getApiSmsChanges
};
