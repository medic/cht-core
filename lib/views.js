exports.data_records_by_reported_date = {
    map: function(doc) {
        if (doc.type.match(/data_record/)) {
            emit([parseInt(doc.reported_date, 10) * -1, doc._id], doc);
        }
    }
};