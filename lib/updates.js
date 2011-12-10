/**
 * Update functions to be exported from the design doc.
 */

var _ = require('underscore')._;

// Supports Ushahidi SMSSync protocol
var getRespBody = exports.getRespBody = function(doc) {
    var resp = '{"payload":{"success":true}}';
    if (doc.from) {
        resp = '{"payload": {'
            + '"success": true, "task": "send", '
            + '"messages": [ { "to": "' + doc.from + '",'
            + '"message": "Zikomo!" }]}}';
    }
    var json = JSON.parse(resp);
    return JSON.stringify(json);
};

exports.add_sms = function (doc, req) {
    // TODO add validation if necessary
    var new_doc = _.extend(req.form, {
        _id: req.uuid,
        type: "sms_message",
        form: req.form
    });
    return [new_doc, getRespBody(new_doc)];
};
