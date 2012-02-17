var templates = require('duality/templates'),
    settings = require('settings/root');

exports.sms_forms = function (doc, req) {
    return {
        title: 'SMS Forms',
        settings: settings,
        content: templates.render('sms_forms.html', req, {})
    };
};