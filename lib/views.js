/**
 * Views to be exported from the design doc.
 */

exports.sms_message_values = {
    map: function (doc) {
        var smsparser = require('views/lib/smsparser');
            smsforms = require('views/lib/smsforms');

        if (doc.type === 'sms_message' && doc.message) {
            var name = doc.message.split('!')[1];
            if (!name) {
                return;
            }
            var def = smsforms[name];
            if (def) {
                emit(
                    [name, doc.sent_timestamp], 
                    smsparser.parseArray(def.fields, doc));
            }
        }
    }
};

exports.sms_messages = {
    map: function (doc) {
        if (doc.type === 'sms_message') {
            emit(doc._id);
        }
    }
}
