function(doc) {
  var skip = [ '_id', '_rev', 'type', 'refid', 'geolocation' ];

  var usedKeys = [];
  var emitMaybe = function(key, value) {
    if (usedKeys.indexOf(key) === -1 && // Not already used
        !key[1].match(/(^$)|(^[^A-Za-z0-9+])/) && // Not empty or starting with bad symbol
        key[1].length > 2 // Not too short
    ) {
      usedKeys.push(key);
      emit(key, value);
    }
  };

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
        emitMaybe([ type, word ], order);
      });
    }
    if (typeof value === 'number' || typeof value === 'string') {
      emitMaybe([ type, key + ':' + value ], order);
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
      emitMaybe([ doc.type, 'clinic:' + clinic._id ], order);
    }
  }
}
