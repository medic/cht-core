function(doc) {
  var emitCaseId = function(value, order) {
    emit(['case_id:' + value], order);
  };

  var emitField = function(type, key, value, order) {
    if (!key || !value) {
      return;
    }

    if (typeof value === 'string') {
      value = value.toLowerCase();
      value.split(/\s+/).forEach(function(word) {
        if (word.length <= 2) {
          return;
        }

        emit([type, word], order);
      });
    }
  };

  var include = [
    'name', 'case_id', 'place_id', 'patient_id', 'external_id', 'house_number', 'notes', 'search_keywords',
  ];
  var types = ['district_hospital', 'health_center', 'clinic', 'person'];
  var idx;
  var type;
  if (doc.type === 'contact') {
    type = doc.contact_type;
    idx = types.indexOf(type);
    if (idx === -1) {
      idx = type;
    }
  } else {
    type = doc.type;
    idx = types.indexOf(type);
  }

  var isContactOrPlace = idx !== -1;
  if (isContactOrPlace) {
    var dead = !!doc.date_of_death;
    var muted = !!doc.muted;
    var order = dead + ' ' + muted + ' ' + idx + ' ' + (doc.name && doc.name.toLowerCase());
    include.forEach(function(key) {
      emitField(type, key, doc[key], order);
    });
    emitCaseId(doc.case_id, order);
  }
}
