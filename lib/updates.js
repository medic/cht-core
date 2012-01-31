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
 * auto-reply message in the form definition. Also uses callbacks to create
 * 1st phase of tasks_referral doc.
 */
var getRespBody = exports.getRespBody = function(doc, req) {

    var form = doc.form,
        def = smsforms[doc.form],
        form_data = smsparser.parse(def, doc, 1),
        phone = doc.from, // set by gateway
        autoreply = 'Data received, thank you.', //TODO localize
        resp = { //smssync gateway response format
            payload: {
                success: true,
                task: "send",
                messages: [{
                    to: phone,
                    message: autoreply}]}};

    if (!form || !def) {
        // TODO integrate with kujua notifications to resolve this, respond
        // with boiler "ok" to the muvuku client.
        log('Error, form defintion not found for %s.'.replace('%s', form));
        return JSON.stringify(resp);
    }

    if (def.autoreply) {
        autoreply = def.autoreply;
    }

    if (!smsforms.isReferralForm(form)) {
        return JSON.stringify(resp);
    }

    /*
     * This is a referral form, so construct tasks_referral doc and callback
     * for gateway to process.
     */

    var cb_path = '',
        task = {
            type: 'tasks_referral',
            state: 'pending',
            from: phone,
            refid: '',
            sms_message: doc,
            messages: [],
            form: form,
            form_data: form_data,
            clinic: null,
            errors: []};

    switch(form) {
        case 'MSBC':
            task.refid = form_data.cref_rc[0];
            cb_path = '/%1/tasks_referral/add/refid/%2'
                      .replace('%1', form)
                      .replace('%2', encodeURIComponent(task.refid));
            break;
        case 'MSBB':
            task.refid = form_data.ref_rc[0];
            cb_path = '/%1/tasks_referral/add/refid/%2'
                      .replace('%1', form)
                      .replace('%2', encodeURIComponent(task.refid));
            break;
        case 'MSBR':
            task.refid = form_data.ref_rc[0];
            cb_path = '/%1/tasks_referral/add/%2'
                      .replace('%1', form)
                      .replace('%2', encodeURIComponent(phone));
            break;
    }

    resp.callback = {
        options: {
            host: "localhost",
            port: 5984,
            path: '/kujua/_design/kujua-export/_rewrite' + cb_path,
            method: "POST",
            headers: {'Content-Type': 'application/json; charset=utf-8'}},
        data: task
    };

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

