const environment = require('../lib/environment');
const { info, warn } = require('../lib/log');
const pouch = require('../lib/db');

module.exports = {
  requiresInstance: true,
  execute: () => {
    const db = pouch();
    const { extraArgs } = environment;
    if (!extraArgs || !extraArgs.length) {
      warn('No forms specified for deleting.');
      return;
    }

    return Promise.all(extraArgs.map(formName => {
      const docId = `form:${formName}`;
      return db.get(docId)
        .then(doc => db.remove(doc))
        .then(() => info('Deleted form:', formName))
        .catch(e => warn(`Failed to remove form with doc ID ${docId}`, e));
    }));
  }
};
