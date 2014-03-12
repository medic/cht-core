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
        var objs;

        if (err) {
            callback(err);
        } else {
            objs = _.reduce(result.rows, function(memo, row) {
                memo[row.id] = memo[row.id] || {
                    due: row.key,
                    doc: row.doc,
                    tasks: []
                };
                memo[row.id].tasks.push(row.value);
                return memo;
            }, {});

            async.forEachSeries(_.keys(objs), function(id, cb) {
                var obj = objs[id],
                    doc = obj.doc,
                    due = obj.due,
                    tasks = obj.tasks;

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
        }
    });
};
