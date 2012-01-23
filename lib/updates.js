/**
 * Update functions to be exported from the design doc.
 */

var _ = require('underscore')._,
    smsforms = require('views/lib/smsforms'),
    db = require('db'),
    //TODO get current db name or url
    //Error: ReferenceError: Error loading: undefined
    //window is not defined
    //db = require('db').current(),
    jsDump = require('jsDump');

/*
 * Return Ushahidi SMSSync compatible response message.  Supports custom
 * auto-reply message in the form definition.
 */
var getRespBody = exports.getRespBody = function(doc, req) {

    var resp = {"payload":{"success":true}},
        autoreply = 'Data received, thank you.';

    log('req is' + jsDump.parse(req));
    log('doc is '+ jsDump.parse(doc));

    if (smsforms[doc.form] && smsforms[doc.form].autoreply) {
        autoreply = smsforms[doc.form].autoreply;
    }

    if (!doc.from) {
        log('sms_message doc is missing from field: ' + doc);
        return JSON.stringify(resp);
    }

    resp = {
        payload: {
            success: true,
            task: "send",
            messages: [{
                to: doc.from,
                message: autoreply}]},
        // callback to get clinic data
        callback: {
            options: {
                host: "localhost",
                port: 5984,
                path: '/kujua/_design/kujua-export/_rewrite' +
                      '/facilities/by_phone/%s'
                      .replace('%s', doc.from) +
                      '?data=' + encodeURIComponent(JSON.stringify(doc)),
                method: "GET"}}};
                //headers: {'Content-Type': 'application/json'},
                // note: doc not saved at this point since there is no _rev
                /*data : {
                    type: 'task_referral',
                    completed: false,
                    sms_message: doc}*/
            /*callback: {
                options: {
                    host: "localhost",
                    port: 5984,
                    path: "/kujua",
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' }},
                // note: doc not saved at this point since there is no _rev
                data : {
                    type: 'task_referral',
                    completed: false,
                    sms_message: doc}}*/
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

