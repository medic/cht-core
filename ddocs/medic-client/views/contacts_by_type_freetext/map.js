function(doc) {
  var skip = [ '_id', '_rev', 'type', 'refid', 'geolocation' ];

  var usedKeys = [];
  var emitMaybe = function(key, value) {
    if (usedKeys.indexOf(key) === -1 && // Not already used
        !key.match(/(^$)|(^[^A-Za-z0-9+])/) && // Not empty or starting with bad symbol
        key.length > 2 // Not too short
    ) {
      usedKeys.push(key);
      emit([doc.type, key], value);
    }
  };

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
        emitMaybe(word, order);
      });
    }
    if (typeof value === 'number' || typeof value === 'string') {
      emitMaybe(key + ':' + value, order);
    }
  };

  var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
  var idx = types.indexOf(doc.type);
  if (idx !== -1) {
    var order = idx + ' ' + (doc.name && doc.name.toLowerCase());
    Object.keys(doc).forEach(function(key) {
      emitField(key, doc[key], order);
    });
    var clinic = doc.type === 'person' ? doc.parent : doc;
    if (clinic && clinic._id) {
      emitMaybe('clinic:' + clinic._id, order);
    }
  }
}
