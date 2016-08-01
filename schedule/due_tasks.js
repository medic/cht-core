var async = require('async'),
    _ = require('underscore'),
    moment = require('moment'),
    utils = require('../lib/utils'),
    date = require('../date');

module.exports = function(db, audit, callback) {
    var now = moment(date.getDate()),
        overdue = now.clone().subtract(7, 'days');

    db.medic.view('medic', 'due_tasks', {
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
            // set task to pending for gateway to pick up
            utils.setTasksStates(obj.doc, 'pending', function(task) {
                return task.due === obj.key;
            });
            audit.saveDoc(obj.doc, cb);
        }, function(err) {
            callback(err);
        });
        
    });
};
