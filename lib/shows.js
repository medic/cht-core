/**
 * Show functions to be exported from the design doc.
 */

var templates = require('duality/templates'),
    smsforms = require('views/lib/smsforms'),
    events = require('duality/events'),
    _ = require('underscore')._;


exports.sms_forms = function (doc, req) {

    events.once('init', function() {
        console.log('hi guys');
        var db = require('db').current(),
            forms = _.keys(smsforms);
        db.getView('kujua-export', 'sms_message_values', function(err, data) {
            console.log(data);
        });
    });

    return {
        title: 'SMS Forms',
        content: templates.render('sms_forms.html', req, {})
    };
};

exports.not_found = function (doc, req) {
    return {
        title: '404 - Not Found',
        content: templates.render('404.html', req, {})
    };
};
