/**
 * Update functions to be exported from the design doc.
 */

var _ = require('underscore')._,
    smsforms = require('views/lib/smsforms'),
    smsparser = require('views/lib/smsparser'),
    //querystring = require('querystring'),
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
var getRespBody = exports.getRespBody = function(doc, req) {

    var formKey = doc.form,
        def = smsforms[doc.form],
        form = smsparser.parse(def, doc),
        phone = doc.from, // set by gateway
        callback_path = '/tasks_referral/add',
        autoreply = 'Data received, thank you.';

    if (!def) {
        autoreply = 'Error 001, form was not found.';
    } else if (def.autoreply) {
        autoreply = def.autoreply;
    }

    // always respond
    var resp = {
            payload: {
                success: true,
                task: "send",
                messages: [{
                    to: phone,
                    message: autoreply}]}};

    if (form) {
        // HACK
        if (formKey === 'MSBC') {
           callback_path += '/refid/' + encodeURIComponent(form.cref_rc);
        } else {
           callback_path += '/' + encodeURIComponent(phone);
        }
        resp.callback = {
            options: {
                host: "localhost",
                port: 5984,
                path: '/kujua/_design/kujua-export/_rewrite' + callback_path +
                      '/?data=' + encodeURIComponent(JSON.stringify(doc)),
                method: "GET"}};
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

