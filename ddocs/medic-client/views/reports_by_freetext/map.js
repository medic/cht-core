function(doc) {
  var skip = [ '_id', '_rev', 'type', 'refid', 'content' ];

  var usedKeys = [];
  var emitMaybe = function(key, value) {
    if (usedKeys.indexOf(key) === -1 && // Not already used
        key.length > 2 // Not too short
    ) {
      usedKeys.push(key);
      emit([key], value);
    }
  };

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
        emitMaybe(word, reportedDate);
      });
    }
    if (typeof value === 'number' || typeof value === 'string') {
      emitMaybe(key + ':' + value, reportedDate);
    }
  };

  if (doc.type === 'data_record' && doc.form) {
    Object.keys(doc).forEach(function(key) {
      emitField(key, doc[key], doc.reported_date);
    });
    if (doc.fields) {
      Object.keys(doc.fields).forEach(function(key) {
        emitField(key, doc.fields[key], doc.reported_date);
      });
    }
    if (doc.contact && doc.contact._id) {
      emitMaybe('contact:' + doc.contact._id.toLowerCase(), doc.reported_date);
    }
  }
}
