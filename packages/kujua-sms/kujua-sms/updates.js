var _ = require('underscore')._,
    smsforms = require('views/lib/smsforms'),
    smsparser = require('views/lib/smsparser');


/*
 * TODO:
 *    - somehow update should work without having to import those functions 
 *      in the update.js file of the project
 *    - rewrite rules need to be exported 
 *
 */


/*
 * Return Ushahidi SMSSync compatible response message.  Supports custom
 * auto-reply message in the form definition. Also uses callbacks to create
 * 1st phase of tasks_referral doc.
 */
var getRespBody = exports.getRespBody = function(doc) {
    var form = doc.form,
        def = smsforms[doc.form],
        form_data = smsparser.parse(def, doc, 1),
        phone = doc.from, // set by gateway
        autoreply = '',//smsforms.getResponse('success'),
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
        var msg = '';//smsforms.getResponse('form_not_found', doc.locale)
                  //.replace('%s', form);
        if (typeof log !== 'undefined')
            log(msg);
        resp.payload.messages[0].message = msg;
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
            state: '',
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
    }

    var duality = require('duality/core');
    
    resp.callback = {
        options: {
            host: "localhost",
            port: 5984,
            path: duality.getDBURL() + cb_path,
            method: "PUT",
            headers: {'Content-Type': 'application/json; charset=utf-8'}},
        data: task
    };

    return JSON.stringify(resp);

};

exports.add_sms = function (doc, req) {
    var new_doc = _.extend(req.form, {
        _id: req.uuid,
        type: "sms_message",
        locale: req.form.locale || 'en',
        form: req.form.message ? req.form.message.split('!')[1] : ''
    });
    return [new_doc, getRespBody(new_doc)];
};

exports.add = function (doc, req) {
};
