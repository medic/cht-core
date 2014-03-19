var async = require('async'),
    _ = require('underscore'),
    moment = require('moment'),
    date = require('../date');

module.exports = function(db, audit, callback) {
    var now = moment(date.getDate()),
        overdue = now.clone().subtract('days', 7);

    db.view('kujua-sentinel', 'due_tasks', {
        include_docs: true,
        endkey: now.toISOString(),
        startkey: overdue.toISOString()
    }, function(err, result) {

        if (err) {
            return callback(err);
        }

        var objs = _.unique(result.rows, false, function(row) {
            return row.id;
        });

        async.forEachSeries(objs, function(obj, cb) {
            var doc = obj.doc,
                due = obj.key;

            // set task to pending for gateway to pick up
            _.each(doc.scheduled_tasks, function(task) {
                if (task.due === due) {
                    task.state = 'pending';
                }
            });

            audit.saveDoc(doc, cb);
        }, function(err) {
            callback(err);
        });
        
    });
};
