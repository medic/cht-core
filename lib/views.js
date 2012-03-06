exports.sms_messages_by_form = {
    map: function(doc) {
        if (doc.type === 'sms_message') {
            emit([doc.form, doc._id], doc);
        }        
    }
};

exports.sms_messages_by_from = {
    map: function(doc) {
        if (doc.type === 'sms_message') {
            emit([doc.from, doc._id], doc);
        }
    }
};

exports.sms_messages_by_timestamp = {
    map: function(doc) {
        if (doc.type === 'sms_message') {
            emit([doc.sent_timestamp, doc._id], doc);
        }
    }
};