function(doc) {
  if (doc.type !== 'data_record' || !doc.form) {
    return;
  }

  var usedKeys = [];
  var emitMaybe = function(key, value) {
    if (
      usedKeys.indexOf(key) === -1 && // Not already used
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

    if (typeof value === 'string') {
      value = value.toLowerCase();
      value.split(/\s+/).forEach(function(word) {
        emitMaybe(word, reportedDate);
      });
    }
  };

  var include = ['patient_id', 'patient_uuid', 'place_id', 'case_id', 'patient_name'];
  include.forEach(function(key) {
    emitField(key, doc[key], doc.reported_date);

    if (doc.fields) {
      emitField(key, doc.fields[key], doc.reported_date);
    }
  });

  if (doc.contact && doc.contact._id) {
    emitMaybe('contact:' + doc.contact._id.toLowerCase(), doc.reported_date);
  }

  if (doc.case_id) {
    emitMaybe('case_id:' + doc.case_id, doc.reported_date);
  }

  if (doc.fields && doc.fields.case_id) {
    emitMaybe('case_id:' + doc.fields.case_id, doc.reported_date);
  }
}
