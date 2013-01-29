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
            console.log('Loading task ' + file);
            return require('./' + file);
        }
    } catch(e) {
        console.error(e); // carry on ...
    }
}));

function sendable(m) {
    var after = config.get('schedule_morning_hours') || 8,
        until = config.get('schedule_evening_hours') || 17;

    return m.hours() >= after && m.hours() <= until;
}

function checkSchedule() {
    var m = moment(date.getDate());

    console.log('Checking sendable window', m._d);
    if (sendable(m)) {
        async.forEachSeries(tasks, function(task, callback) {
            task(callback);
        }, function(e) {
            if (e) {
                console.error('Error running tasks: ' + JSON.stringify(e));
            }
            reschedule();
        });
    } else {
        reschedule();
    }
}

function reschedule() {
    var now = moment(),
        heartbeat = now.clone().add('hours', 1).minutes(0).seconds(0).milliseconds(0),
        duration = moment.duration(heartbeat.valueOf() - now.valueOf());

    console.log('Checking schedule in ' + duration.humanize() + '...');
    setTimeout(checkSchedule, duration.asMilliseconds());
}

checkSchedule();
