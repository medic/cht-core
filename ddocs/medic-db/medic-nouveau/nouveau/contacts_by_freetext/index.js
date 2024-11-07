function (doc) {
  const skip = ['_id', '_rev', 'type', 'refid', 'geolocation'];
  let toIndex = '';

  const types = ['district_hospital', 'health_center', 'clinic', 'person'];
  let idx;
  if (doc.type === 'contact') {
    idx = types.indexOf(doc.contact_type);
    if (idx === -1) {
      idx = doc.contact_type;
    }
  } else {
    idx = types.indexOf(doc.type);
  }

  const isContactDoc = idx !== -1;
  if (isContactDoc) {
    Object.keys(doc).forEach(function (key) {
      const value = doc[key];
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

    toIndex = toIndex.trim();
    if (toIndex) {
      index('text', 'default', toIndex, { store: true });
    }
  }
}
