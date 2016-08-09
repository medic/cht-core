function(doc) {
  var skip = [ '_id', '_rev', 'type', 'refid' ];

  var emitField = function(key, value, reportedDate) {
    if (!key || !value) {
      return;
    }
    key = key.toLowerCase();
    if (skip.indexOf(key) !== -1 || /_date$/.test(key)) {
      return;
    }
    if (typeof value === 'string') {
      value = value.toLowerCase();
      value.split(/\s+/).forEach(function(word) {
        emit([ word ], reportedDate);
      });
    }
    if (typeof value === 'number' || typeof value === 'string') {
      emit([ key + ':' + value ], reportedDate);
    }
  };

  if (doc.type === 'data_record' && doc.form) {
    for (var key in doc) {
      emitField(key, doc[key], doc.reported_date);
    }
    if (doc.fields) {
      for (var key in doc.fields) {
        emitField(key, doc.fields[key], doc.reported_date);
      }
    }
    if (doc.contact && doc.contact._id) {
      emit([ 'contact:' + doc.contact._id ], doc.reported_date);
    }
  }
}
