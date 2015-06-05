var async = require('async'),
    config = require('../config'),
    request = require('request'),
    utils = require('../lib/utils'),
    moment = require('moment');

module.exports = {
    filter: function(doc) {
        function hasPending(doc) {
            var ret = false;
            if (!doc.tasks) {
                return ret;
            }
            doc.tasks.forEach(function(task) {
                if (task.state === 'pending') {
                    ret = true;
                }
            });
            return ret;
        }
        function hasConfig() {
            var twilioSid = config.get('twilio_sid'),
                twilioToken = config.get('twilio_token');
            return twilioSid && twilioToken;
        }
        return Boolean(
            doc &&
            hasPending(doc) &&
            hasConfig()
        );
    },
    onMatch: function(change, db, audit, callback) {
        var doc = change.doc,
            twilioSid = config.get('twilio_sid'),
            twilioToken = config.get('twilio_token'),
            auth = twilioSid && twilioToken ? 'Basic ' + new Buffer(twilioSid + ':' + twilioToken).toString('base64') : false;

        if (auth) {
            async.map(doc.tasks, function(task, taskCallback) {
                if (task.state === 'pending') {
                    async.forEachSeries(task.messages, function(message, messageCallback) {
                        request.post({
                            form: {
                                Body: message.message,
                                From: '+15037664982',
                                To: message.to
                            },
                            headers: {
                                Authorization: auth
                            },
                            url: 'https://api.twilio.com/2010-04-01/Accounts/' + twilioSid + '/SMS/Messages.json'
                        }, function(err, res, body) {
                            if (err) {
                                message.twilioResponse = err;
                                messageCallback(err);
                            } else if (Math.floor(res.statusCode / 100) !== 2) {
                                err = JSON.parse(body);
                                message.twilioResponse = err;
                                messageCallback(err);
                            } else {
                                message.twilioResponse = JSON.parse(body);
                                messageCallback();
                            }
                        });
                    }, function(err) {
                        if (err) {
                            console.error(JSON.stringify(err));
                        } else {
                            utils.setTaskState(task, 'sent');
                            task.timestamp = moment().toISOString();
                        }
                        taskCallback(null, task);
                    });
                } else {
                    taskCallback(null, task);
                }
            }, function(err, tasks) {
                if (err) {
                    return callback(err);
                }
                doc.tasks = tasks;
                callback(null, true);
            });
        } else {
            callback();
        }
    }
};
