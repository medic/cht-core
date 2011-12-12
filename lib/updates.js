/**
 * Update functions to be exported from the design doc.
 */

var _ = require('underscore')._,
    smsforms = require('views/lib/smsforms');

/*
 * Return Ushahidi SMSSync compatible response message.  Supports custom
 * auto-reply message in the form definition.
 */
var getRespBody = exports.getRespBody = function(doc) {

    var resp = '{"payload":{"success":true}}',
        autoreply = 'Data received, thank you.';

    if (smsforms[doc.form] && smsforms[doc.form].autoreply) {
        autoreply = smsforms[doc.form].autoreply;
    }

    if (doc.from) {
        resp = '{"payload": {'
            + '"success": true, "task": "send", '
            + '"messages": [ { "to": "' + doc.from + '",'
            + '"message": "' + autoreply + '" }]}}';
    }

    var json = JSON.parse(resp);
    return JSON.stringify(json);

};

exports.add_sms = function (doc, req) {
    // TODO add validation if necessary
    log(['hi req.form', req.form]);
    var new_doc = _.extend(req.form, {
        _id: req.uuid,
        type: "sms_message",
        form: req.form.message.split('!')[1]
    });
    return [new_doc, getRespBody(new_doc)];
};
