function (doc) {
  var skip = ['_id', '_rev', 'type', 'refid', 'geolocation'];
  let toIndex = '';

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
  if (idx !== -1) {
    Object.keys(doc).forEach(function (key) {
      var value = doc[key];
      if (!key || !value) {
        return;
      }
      key = key.toLowerCase();
      if (skip.indexOf(key) !== -1 || /_date$/.test(key)) {
        return;
      }

      if (typeof value === 'string') {
        toIndex += ' ' + value;
        // index('text', key, value, { store: true });
      }

      if (typeof value === 'number') {
        // index('double', key, value, { store: true });
      }

      /*const fieldNameRegex = /^\$?[a-zA-Z][a-zA-Z0-9_]*$/g
      if (fieldNameRegex.test(key)) {
        console.log(`key "${key}" doesn't pass regex`);
      }*/
    });
  }

  toIndex = toIndex.trim();
  if (toIndex) {
    index('text', 'default', toIndex, { store: true });
  }
}
