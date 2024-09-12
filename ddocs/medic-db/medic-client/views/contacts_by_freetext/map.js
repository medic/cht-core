function(doc) {
  var emitCaseId = function(value, order) {
    emit(['case_id:' + value], order);
  };

  var emitField = function(key, value, order) {
    if (!key || !value) {
      return;
    }

    if (typeof value === 'string') {
      value = value.toLowerCase();
      value.split(/\s+/).forEach(function(word) {
        if (word.length <= 2) {
          return;
        }

        emit([word], order);
      });
    }
  };

  var include = [
    'name', 'case_id', 'place_id', 'patient_id', 'external_id', 'house_number', 'notes', 'search_keywords',
  ];
  var types = ['district_hospital', 'health_center', 'clinic', 'person'];
  var idx;
  if (doc.type === 'contact') {
    idx = types.indexOf(doc.contact_type);
    if (idx === -1) {
      idx = doc.contact_type;
    }
  } else {
    idx = types.indexOf(doc.type);
  }

  var isContactOrPlace = idx !== -1;
  if (isContactOrPlace) {
    var dead = !!doc.date_of_death;
    var muted = !!doc.muted;
    var order = dead + ' ' + muted + ' ' + idx + ' ' + (doc.name && doc.name.toLowerCase());
    include.forEach(function(key) {
      emitField(key, doc[key], order);
    });
    emitCaseId(doc.case_id, order);
  }
}
