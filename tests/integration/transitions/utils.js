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
    // Increase timeout for CI environments
    const timeout = process.env.CI ? 30000 : 10000;
    const timeoutId = setTimeout(() => {
      listener.cancel();
      console.error('still expecting', expectedMessages);
      console.error('received changes for:', ids);
      reject(new Error(`Did not receive all expected messages in ${timeout/1000}s`));
    }, timeout);
    
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

/**
 * Wait for Sentinel to finish processing documents
 * Polls documents until they reach expected state
 */
const waitForSentinelProcessing = async (docIds, expectedStateCheck, maxWaitMs = 10000) => {
  const startTime = Date.now();
  const pollInterval = 200; // Check every 200ms
  
  while (Date.now() - startTime < maxWaitMs) {
    const docs = await utils.getDocs(docIds);
    const allReady = docs.every(doc => {
      try {
        return expectedStateCheck(doc);
      } catch {
        return false;
      }
    });
    
    if (allReady) {
      return docs;
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  // Timeout - return docs anyway for debugging
  const docs = await utils.getDocs(docIds);
  console.error('Timeout waiting for Sentinel processing. Current doc states:', 
    docs.map(d => ({ id: d._id, tasks: d.tasks?.map(t => ({ state: t.state, history: t.state_history?.length })) })));
  return docs;
};

module.exports = {
  getApiSmsChanges,
  waitForSentinelProcessing
};
