exports.data_records_by_reported_date = {
    map: function(doc) {
        if (doc.type.match(/data_record/)) {
            emit([parseInt(doc.reported_date, 10) * -1, doc._id], doc);
        }
    }
};

exports.data_record_form_keys = {
    map: function(doc) {
        if(doc.type.match(/data_record/)) {
            var smsforms = require('views/lib/smsforms');

            if (smsforms[doc.form]) {
                emit([doc.form, smsforms[doc.form].title || doc.form], 1);
            }
        }
    },
    
    reduce: function(tag, counts) {
        return sum(counts);
    }
};