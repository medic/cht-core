function(doc) {
  var skip = [ '_id', '_rev', 'type', 'refid' ];

  var emitField = function(key, value, order) {
    if (!key || !value) {
      return;
    }
    key = key.toLowerCase();
    if (skip.indexOf(key) !== -1 || /_date$/.test(key)) {
      return;
    }
    if (key === 'parent' && typeof value === 'object' && value.hasOwnProperty('name')) {
      value = value.name;
    }
    if (typeof value === 'string') {
      value = value.toLowerCase();
      value.split(/\s+/).forEach(function(word) {
        emit([ word ], order);
      });
    }
    if (typeof value === 'number' || typeof value === 'string') {
      emit([ key + ':' + value ], order);
    }
  };

  var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
  var idx = types.indexOf(doc.type);
  if (idx !== -1) {
    var order = idx + ' ' + (doc.name && doc.name.toLowerCase());
    for (var key in doc) {
      emitField(key, doc[key], order);
    }
    var clinic = doc.type === 'person' ? doc.parent : doc;
    if (clinic && clinic._id) {
      emit([ 'clinic:' + clinic._id ], order);
    }
  }
}
