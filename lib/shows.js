/**
 * Show functions to be exported from the design doc.
 */

var templates = require('duality/templates'),
    settings = require('settings/root');

exports.sms_forms = function (doc, req) {
    return {
        title: 'SMS Forms',
        settings: settings,
        content: templates.render('sms_forms.html', req, {})
    };
};

exports.not_found = function (doc, req) {
    return {
        title: '404 - Not Found',
        content: templates.render('404.html', req, {})
    };
};
