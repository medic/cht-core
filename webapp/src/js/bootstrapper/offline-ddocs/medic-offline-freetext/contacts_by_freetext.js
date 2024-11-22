module.exports.map = function(doc) {
  const skip = [ '_id', '_rev', 'type', 'refid', 'geolocation' ];

  const usedKeys = [];
  const emitMaybe = (key, value) => {
    if (usedKeys.indexOf(key) === -1 && // Not already used
      key.length > 2 // Not too short
    ) {
      usedKeys.push(key);
      emit([key], value);
    }
  };

  const emitField = (key, value, order) => {
    if (!value) {
      return;
    }
    const lowerKey = key.toLowerCase();
    if (skip.indexOf(lowerKey) !== -1 || /_date$/.test(lowerKey)) {
      return;
    }
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      lowerValue
        .split(/\s+/)
        .forEach((word) => emitMaybe(word, order));
      emitMaybe(`${lowerKey}:${lowerValue}`, order);
    } else if (typeof value === 'number') {
      emitMaybe(`${lowerKey}:${value}`, order);
    }
  };

  const getTypeIndex = () => {
    const types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
    if (doc.type !== 'contact') {
      return types.indexOf(doc.type);
    }

    const contactTypeIdx = types.indexOf(doc.contact_type);
    if (contactTypeIdx >= 0) {
      return contactTypeIdx;
    }

    return doc.contact_type;
  };

  const idx = getTypeIndex();
  if (idx === -1) {
    return;
  }

  const dead = !!doc.date_of_death;
  const muted = !!doc.muted;
  const order = `${dead} ${muted} ${idx} ${(doc.name && doc.name.toLowerCase())}`;
  Object
    .keys(doc)
    .forEach((key) => emitField(key, doc[key], order));
};
