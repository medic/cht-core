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
            emit([parseInt(doc.created, 10) * -1, doc._id], doc);
        }
    }
};