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

/*
 * Return true if within time window to set outgoing/pending tasks/messages.
 */
exports.sendable = function(_config, _now) {
    var afterHours = _config.get('schedule_morning_hours') || 0,
        afterMinutes = _config.get('schedule_morning_minutes') || 0,
        untilHours = _config.get('schedule_evening_hours') || 23,
        untilMinutes = _config.get('schedule_evening_minutes') || 0;

    var now = _getTime(_now.hours(), _now.minutes());
    var after = _getTime(afterHours, afterMinutes);
    var until = _getTime(untilHours, untilMinutes);

    return now >= after && now <= until;
};

exports.checkSchedule = function() {
    var db = require('../db'),
        audit = require('couchdb-audit').withNode(db, db.user),
        now = moment(date.getDate());

    async.forEachSeries(tasks, function(task, callback) {
        if (_.isFunction(task.execute)) {
            task.execute({
                db: db,
                audit: audit
            }, callback);
        } else if (exports.sendable(config, now)) {
            task(db, audit, callback);
        } else {
            callback();
        }
    }, function(err) {
        if (err) {
            console.error('Error running tasks: ' + JSON.stringify(err));
        }
        _reschedule();
    });
};

function _reschedule() {
    var now = moment(),
        heartbeat = now.clone().startOf('minute').add('minutes', 5),
        duration = moment.duration(heartbeat.valueOf() - now.valueOf());

    console.log('checking schedule again in', moment.duration(duration).humanize());
    setTimeout(exports.checkSchedule, duration.asMilliseconds());
}

function _getTime(_hour, _minute) {
    return moment(0).hours(_hour).minutes(_minute);
}