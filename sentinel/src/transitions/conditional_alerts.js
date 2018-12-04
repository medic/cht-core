const config = require('../config'),
      _ = require('underscore'),
      messages = require('../lib/messages'),
      utils = require('../lib/utils'),
      async = require('async'),
      transitionUtils = require('./utils'),
      NAME = 'conditional_alerts';

const runCondition = (condition, context) => {
  try {
    return Promise.resolve(utils.evalExpression(condition, context));
  } catch(e) {
    return Promise.reject(e.message);
  }
};

const evaluateCondition = (doc, alert) => {
  const context = { doc: doc };
  if (alert.condition.indexOf(alert.form) === -1) {
    return runCondition(alert.condition, context);
  }
  return utils.getReportsWithSameClinicAndForm({
    doc: doc,
    formName: alert.form
  })
    .then(rows => {
      rows = _.sortBy(rows, function(row) {
        return row.reported_date;
      });
      context[alert.form] = function(i) {
        const row = rows[rows.length - 1 - i];
        return row ? row.doc : row;
      };
      return runCondition(alert.condition, context);
    });
};

module.exports = {
  _getConfig: function() {
    return _.extend({}, config.get('alerts'));
  },
  filter: function(doc, info={}) {
    return Boolean(
      doc &&
      doc.form &&
      doc.type === 'data_record' &&
      !transitionUtils.hasRun(info, NAME)
    );
  },
  onMatch: change => {
    return new Promise((resolve, reject) => {
      const doc = change.doc,
        config = module.exports._getConfig();
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
