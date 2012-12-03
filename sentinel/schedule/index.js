var fs = require('fs'),
    _ = require('underscore'),
    async = require('async'),
    date = require('../date'),
    moment = require('moment'),
    tasks;

tasks = _.compact(_.map(fs.readdirSync(__dirname), function(file) {
    try {
        if (!/^index\./.test(file)) {
            console.log('Loading task ' + file);
            require('./' + file);
        }
    } catch(e) {
        console.error(e); // carry on ...
    }
}));

function sendable(m) {
    return m.hours() >= 8 && m.hours() <= 17;
}

function checkSchedule() {
    var m = moment(date.getDate());

    if (sendable(m)) {
        async.forEach(tasks, function(task, callback) {
            task(callback);
        }, function(e) {
            if (e) {
                console.error('Error running tasks: ' + e);
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
