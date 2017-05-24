module.exports = {
    filter: function(doc) {
        var self = module.exports;
        return Boolean(
            doc &&
            doc.from &&
            doc.type === 'data_record' &&
            doc.sent_by === undefined &&
            !self._hasRun(doc)
        );
    },
    _hasRun: function(doc) {
        return Boolean(
            doc &&
            doc.transitions &&
            doc.transitions.update_sent_by &&
            doc.transitions.update_sent_by.ok
        );
    },
    onMatch: function(change, db, audit, callback) {
        var doc = change.doc;

        db.medic.view('medic-client', 'contacts_by_phone', {
            key: doc.from,
            include_docs: true
        }, function(err, result) {
            if (err) {
                return callback(err);
            }
            var sentBy = result.rows &&
                         result.rows.length &&
                         result.rows[0].doc &&
                         result.rows[0].doc.name;
            if (sentBy) {
                doc.sent_by = sentBy;
                return callback(null, true);
            }
            callback();
        });
    }
};
