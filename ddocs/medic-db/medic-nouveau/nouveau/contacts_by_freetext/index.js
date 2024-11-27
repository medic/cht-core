function (doc) {
  var skip = ['_id', '_rev', 'type', 'refid', 'geolocation'];
  var toIndex = '';

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

  var isContactDoc = idx !== -1;
  if (isContactDoc) {
    Object.keys(doc).forEach(function (key) {
      var value = doc[key];
      if (!key || !value) {
        return;
      }

      key = key.toLowerCase().trim();
      if (skip.indexOf(key) !== -1 || /_date$/.test(key)) {
        return;
      }

      if (typeof value === 'string') {
        toIndex += ' ' + value;
        index('text', key, value, { store: true });
      }

      if (typeof value === 'number') {
        index('double', key, value, { store: true });
      }
    });

    toIndex = toIndex.trim();
    if (toIndex) {
      index('text', 'default', toIndex, { store: true });
    }
  }
}
