var config = require('../config'),
    request = require('request'),
    twilioSid = config.get('twilio_sid'),
    twilioToken = config.get('twilio_token'),
    auth = twilioSid && twilioToken ? 'Basic ' + new Buffer(twilioSid + ':' + twilioToken).toString('base64') : false;

module.exports = {
    db: require('../db'),
    onMatch: function(change, callback) {
        var doc = change.doc;

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
                            url: "https://api.twilio.com/2010-04-01/Accounts/" + twilioSid + "/SMS/Messages.json"
                        }, function(err, res, body) {
                            if (err) {
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
                            taskCallback(null, task);
                        } else {
                            task.state = 'sent';
                            task.timestamp = Date.now();
                            taskCallback(null, task);
                        }
                    });
                } else {
                    taskCallback(null, task);
                }
            }, function(err, tasks) {
                doc.tasks = tasks;
                db.saveDoc(doc, function(err) {
                    callback(err, true);
                });
            });
        } else {
            callback(null, false);
        }
    }
};
