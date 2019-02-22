var transitionUtils = require('./utils');

module.exports = {
  filter: doc => doc.type === 'person' && !doc.patient_id,
  onMatch: change => {
    return new Promise((resolve, reject) => {
      transitionUtils.addUniqueId(change.doc, err => {
        if (err) {
          return reject(err);
        }
        resolve(true);
      });
    });
  }
};
