var async = require('async'),
    _ = require('underscore'),
    db = require('../db'),
    moment = require('moment'),
    date = require('../date');

module.exports = function(callback) {
    var m = moment(date.getDate()),
        overdue = m.clone().subtract('days', 7);

    db.view('kujua-sentinel', 'due_tasks', {
        include_docs: true,
        endkey: now.getTime(),
        startkey: overdue.getTime()
    }, function(err, result) {
        if (err) {
            callback(err);
        } else {
            async.forEachSeries(result.rows, function(row, cb) {
                var due = row.key,
                    doc = row.doc,
                    index = row.value,
                    scheduled = doc.scheduled_tasks || [],
                    tasks = doc.tasks || [],
                    toDo = scheduled.splice(index, 1);

                if (toDo && toDo.due === due) {
                    tasks.push({
                        messages: toDo.messages
                        state: 'pending'
                    });
                }
                db.saveDoc(cb);
            }, function(err) {
                callback(err);
            });
        }
    });
};
