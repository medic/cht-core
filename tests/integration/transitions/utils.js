const utils = require('@utils');

const getApiSmsChanges = async (messages) => {
  const expectedMessages = messages.map(message => message.content);
  const changes = [];
  const ids = [];
  
  // Get current sequence BEFORE starting listener to avoid race condition
  const dbInfo = await utils.db.info();
  const since = dbInfo.update_seq;
  
  const listener = utils.db.changes({
    live: true,
    include_docs: true,
    since: since  // Start from known sequence instead of 'now'
  });

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      listener.cancel();
      console.error('still expecting', expectedMessages);
      console.error('received changes for:', ids);
      reject(new Error('Did not receive all expected messages in 10s'));
    }, 10000);
    
    listener.on('change', change => {
      if (change.doc.sms_message) {
        if (ids.includes(change.id)) {
          return;
        }
        const idx = expectedMessages.findIndex(message => message === change.doc.sms_message.message);
        if (idx === -1) {
          // Message not in expected list, skip it
          return;
        }
        changes.push(change);
        expectedMessages.splice(idx, 1);

        ids.push(change.id);
        if (!expectedMessages.length) {
          listener.cancel();
          clearTimeout(timeoutId);
          resolve(changes);
        }
      }
    });
    
    listener.on('error', (err) => {
      listener.cancel();
      clearTimeout(timeoutId);
      reject(err);
    });
  });
};

module.exports = {
  getApiSmsChanges
};
