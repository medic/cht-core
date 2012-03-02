exports.data_records = {
    map: function(doc) {
        if(doc.type.match(/data_record/)) {
            emit(doc._id, doc);
        }        
    }
};