exports.data_records_by_reported_date = {
    map: function(doc) {
        if (doc.type.match(/data_record/)) {
            var date = parseInt(doc.reported_date, 10) * -1;
            var district_hospital = doc.related_entities.clinic.parent.parent;
            emit([district_hospital._id, date, doc._id], doc);
        }
    }
};

exports.district_hospitals_from_data_records = {
    map: function(doc) {
        if (doc.type.match(/data_record/)) {
            var district_hospital = doc.related_entities.clinic.parent.parent;
            emit([district_hospital._id, district_hospital.name], null);
        }
    },
    
    reduce: function(key, doc) {
        return true;
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
    
    reduce: function(key, counts) {
        return sum(counts);
    }
};