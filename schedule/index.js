var fs = require('fs'),
    _ = require('underscore'),
    async = require('async'),
    date = require('../date'),
    moment = require('moment'),
    config = require('../config'),
    tasks;

tasks = _.compact(_.map(fs.readdirSync(__dirname), function(file) {
    try {
        if (!/^index\./.test(file)) {
            return require('./' + file);
        }
    } catch(e) {
        console.error(e); // carry on ...
    }
}));

function sendable(m) {
    var after = config.get('schedule_morning_hours') || 8,
        until = config.get('schedule_evening_hours') || 17,
        hour = m.hours();

    return hour >= after && hour <= until;
}

function checkSchedule() {
    var db = require('../db'),
        now = moment(date.getDate());

    async.forEachSeries(tasks, function(task, callback) {
        if (_.isFunction(task.execute)) {
            task.execute({
                db: db
            }, callback);
        } else if (sendable(now)) { // in time window for moving due_tasks
            task(db, callback);
        } else {
            callback();
        }
    }, function(err) {
        if (err) {
            console.error('Error running tasks: ' + JSON.stringify(err));
        }
        reschedule();
    });
}

function reschedule() {
    var now = moment(),
        heartbeat = now.clone().startOf('hour').add('hours', 1),
        duration = moment.duration(heartbeat.valueOf() - now.valueOf());

    console.log('checking schedule again in', moment.duration(duration).humanize());
    setTimeout(checkSchedule, duration.asMilliseconds());
}

checkSchedule();
