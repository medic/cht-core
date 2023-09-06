const config = require('../config');
const _ = require('lodash');
const messages = require('../lib/messages');
const utils = require('../lib/utils');
const async = require('async');
const transitionUtils = require('./utils');
const NAME = 'conditional_alerts';

const runCondition = (condition, context) => {
  try {
    return Promise.resolve(utils.evalExpression(condition, context));
  } catch (e) {
    return Promise.reject(e.message);
  }
};

const evaluateCondition = (doc, alert) => {
  const context = { doc: doc };
  if (alert.condition.indexOf(alert.form) === -1) {
    return runCondition(alert.condition, context);
  }
  return utils.getReportsWithSameParentAndForm({ doc: doc, formName: alert.form })
    .then(rows => rows.map(row => row.doc))
    .then(docs => {
      if (!doc._id) {
        docs.push(doc);
      } else {
        const index = docs.findIndex(dbDoc => dbDoc._id === doc._id);
        if (index === -1) {
          // this is a new doc
          docs.push(doc);
        } else {
          // firing on update: replace the doc in the db with the current doc
          // which may have been changed by other transitions
          docs[index] = doc;
        }
      }
      return docs;
    })
    .then(docs => docs.sort((lhs, rhs) => lhs.reported_date - rhs.reported_date))
    .then(docs => context[alert.form] = i => docs[docs.length - 1 - i])
    .then(() => runCondition(alert.condition, context));
};

module.exports = {
  name: NAME,
  _getConfig: function() {
    return Object.assign({}, config.get('alerts'));
  },
  filter: function({ doc, info }) {
    return Boolean(
      doc &&
      doc.form &&
      doc.type === 'data_record' &&
      !transitionUtils.hasRun(info, NAME) &&
      utils.isValidSubmission(doc)
    );
  },
  onMatch: change => {
    return new Promise((resolve, reject) => {
      const doc = change.doc;
      const config = module.exports._getConfig();
      let updated = false;

      async.each(
        _.values(config),
        function(alert, callback) {
          if (alert.form === doc.form) {
            evaluateCondition(doc, alert)
              .then(result => {
                if (result) {
                  messages.addMessage(doc, alert, alert.recipient);
                  updated = true;
                }
                callback();
              })
              .catch(callback);
          } else {
            callback();
          }
        },
        function(err) {
          if (err) {
            return reject(err);
          }
          resolve(updated);
        }
      );
    });
  }
};
