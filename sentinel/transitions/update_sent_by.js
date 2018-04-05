const transitionUtils = require('./utils'),
      db = require('../db-nano'),
      NAME = 'update_sent_by';

module.exports = {
    filter: function(doc, info={}) {
        var self = module.exports;
        return Boolean(
            doc &&
            doc.from &&
            doc.type === 'data_record' &&
            doc.sent_by === undefined &&
            !self._hasRun(info)
        );
    },
    _hasRun: function(doc) {
        return Boolean(
            transitionUtils.hasRun(doc, NAME) &&
            doc.transitions[NAME].ok
        );
    },
    onMatch: change => {
        return new Promise((resolve, reject) => {
            var doc = change.doc;
            db.medic.view('medic-client', 'contacts_by_phone', {
                key: doc.from,
                include_docs: true
            }, function(err, result) {
                if (err) {
                    return reject(err);
                }
                var sentBy = result.rows &&
                             result.rows.length &&
                             result.rows[0].doc &&
                             result.rows[0].doc.name;
                if (sentBy) {
                    doc.sent_by = sentBy;
                    return resolve(true);
                }
                resolve();
            });
        });
    }
};
