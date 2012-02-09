/**
 * Update functions to be exported from the design doc.
 */

var _ = require('underscore')._,
    smsforms = require('views/lib/smsforms'),
    smsparser = require('views/lib/smsparser');
    //querystring = require('querystring'),
    //TODO get current db name or url
    //Error: ReferenceError: Error loading: undefined
    //window is not defined
    //db = require('db').current(),


/*
 * Return Ushahidi SMSSync compatible response message.  Supports custom
 * auto-reply message in the form definition. Also uses callbacks to create
 * 1st phase of tasks_referral doc.
 */
var getRespBody = exports.getRespBody = function(doc) {

    var form = doc.form,
        def = smsforms[doc.form],
        form_data = smsparser.parse(def, doc, 1),
        baseURL = require('duality/core').getBaseURL(),
        phone = doc.from, // set by gateway
        autoreply = smsforms.getResponse('success'),
        errormsg = '',
        resp = { //smssync gateway response format
            payload: {
                success: true,
                task: "send",
                messages: [{
                    to: phone,
                    message: autoreply}]}};

    if (!doc.message || !doc.message.trim()) {
        errormsg = smsforms.getResponse('error', doc.locale);
    } else if (!form || !def) {
        errormsg = smsforms.getResponse('form_not_found', doc.locale)
                  .replace('%(form)', form || 'NULL');
    }

    if (errormsg) {
        // TODO integrate with kujua notifications
        if (typeof log !== 'undefined')
            log({'error':errormsg, 'doc':doc});
        resp.payload.messages[0].message = errormsg;
        return JSON.stringify(resp);
    }

    if (def.autoreply) {
        resp.payload.messages[0].message = def.autoreply;
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
            to: '',
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
                      .replace('%1', encodeURIComponent(form))
                      .replace('%2', encodeURIComponent(task.refid));
            break;
        case 'MSBB':
            task.refid = form_data.ref_rc[0];
            cb_path = '/%1/tasks_referral/add/refid/%2'
                      .replace('%1', encodeURIComponent(form))
                      .replace('%2', encodeURIComponent(task.refid));
            break;
        case 'MSBR':
            task.refid = form_data.ref_rc[0];
            cb_path = '/%1/tasks_referral/add/%2'
                      .replace('%1', encodeURIComponent(form))
                      .replace('%2', encodeURIComponent(phone));
            break;
    };

    resp.callback = {
        options: {
            host: "localhost",
            port: 5984,
            path: baseURL + cb_path,
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
        locale: req.query.locale || 'en',
        form: req.form.message ? req.form.message.split('!')[1] : ''
    });
    return [new_doc, getRespBody(new_doc)];
};

exports.add = function (doc, req) {
};

