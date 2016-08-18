function(doc) {
  var skip = [ '_id', '_rev', 'type', 'refid' ];

  var emitField = function(key, value, type, order) {
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
        emit([ type, word ], order);
      });
    }
    if (typeof value === 'number' || typeof value === 'string') {
      emit([ type, key + ':' + value ], order);
    }
  };

  var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
  var idx = types.indexOf(doc.type);
  if (idx !== -1) {
    var order = idx + ' ' + (doc.name && doc.name.toLowerCase());
    Object.keys(doc).forEach(function(key) {
      emitField(key, doc[key], doc.type, order);
    });
    var clinic = doc.type === 'person' ? doc.parent : doc;
    if (clinic && clinic._id) {
      emit([ doc.type, 'clinic:' + clinic._id ], order);
    }
  }
}
