/**
 * Update functions to be exported from the design doc.
 */

var _ = require('underscore')._

// Supports Ushahidi SMSSync protocol
exports.add_sms = function (doc, req) {
    // TODO add validation if necessary
    var new_doc = _.extend(req.form, {
        _id: req.uuid,
        type: "sms_message"
    });
    return [new_doc, '{"payload": {"success": true}}'];
};
