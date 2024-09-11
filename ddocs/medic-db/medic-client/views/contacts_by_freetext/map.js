function(doc) {
  var emitField = function(key, value, order) {
    if (!key || !value) {
      return;
    }

    key = key.toLowerCase();

    if (typeof value === 'string') {
      value = value.toLowerCase();
      value.split(/\s+/).forEach(function(word) {
        if (word.length <= 2) {
          return;
        }

        emit([word], order);
      });
    }

    if (typeof value === 'number' || typeof value === 'string') {
      emit([key + ':' + value], order); // TODO: only `case_id`
    }
  };

  var include = ['name', 'external_id', 'notes']; // TODO: add the other fields
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
  }
}
