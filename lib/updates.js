/**
 * Update functions to be exported from the design doc.
 */

var _ = require('underscore')._,
    smsforms = require('views/lib/smsforms'),
    smsparser = require('views/lib/smsparser'),
    querystring = require('querystring'),
    //TODO get current db name or url
    //Error: ReferenceError: Error loading: undefined
    //window is not defined
    //db = require('db').current(),
    jsDump = require('jsDump');

/*
 * Return Ushahidi SMSSync compatible response message.  Supports custom
 * auto-reply message in the form definition. Uses callbacks used to create
 * task_referral documents.
 */
var getRespBody = function(doc, req) {

    var resp = {payload: {success:true} },
        autoreply = 'Data received, thank you.',
        form = smsforms[doc.form];

    if (form && form.autoreply) {
        autoreply = form.autoreply;
    }

    if (doc.from) {
        resp.payload.task = "send";
        resp.payload.messages = [{
            to: doc.from,
            message: autoreply}];
        resp.callback = {
            options: {
                host: "localhost",
                port: 5984,
                path: '/kujua/_design/kujua-export/_rewrite' +
                      '/tasks_referral/add/' + doc.from +
                      '?data=' + encodeURIComponent(JSON.stringify(doc)),
                method: "GET"}};
    } else {
        if (log)
            log('ERROR: sms_message doc missing from field: ' + doc);
    }

    if (!form) {
        if (log)
            log('ERROR: sms_message doc missing form field: ' + doc);
    }

    return JSON.stringify(resp);
};

exports.add_sms = function (doc, req) {
    // TODO add validation if necessary
    var new_doc = _.extend(req.form, {
        _id: req.uuid,
        type: "sms_message",
        form: req.form.message ? req.form.message.split('!')[1] : ''
    });
    return [new_doc, getRespBody(new_doc, req)];
};

exports.add = function (doc, req) {
};

