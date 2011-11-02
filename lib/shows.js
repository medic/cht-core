/**
 * Show functions to be exported from the design doc.
 */

var templates = require('duality/templates'),
    smsforms = require('views/lib/smsforms'),
    _ = require('underscore')._;


exports.sms_forms = function (doc, req) {
    return {
        title: 'SMS Forms',
        content: templates.render('sms_forms.html', req, {
            forms: _.keys(smsforms)
        })
    };
};

exports.not_found = function (doc, req) {
    return {
        title: '404 - Not Found',
        content: templates.render('404.html', req, {})
    };
};
