function (doc) {
  'different 2';
  var skip = ['_id', '_rev', 'type', 'refid', 'geolocation'];
  var toIndex = '';

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

    var dead = !!doc.date_of_death;
    var muted = !!doc.muted;
    var order = dead + ' ' + muted + ' ' + idx + ' ' + (doc.name && doc.name.toLowerCase());
    index('string', 'cht_sort_order', order, { store: false });
    index('text', 'cht_contact_type', type, { store: false });

    toIndex = toIndex.trim();
    if (toIndex) {
      index('text', 'default', toIndex, { store: true });
    }
  }
}
