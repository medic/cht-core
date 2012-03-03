exports.data_records = {
    map: function(doc) {
        if (doc.type && doc.type.substr(0,11) === 'data_record') {
            emit([doc.created, doc._id], doc);
        }
    }
};
