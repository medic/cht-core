module.exports.map = (doc) => {
  const { DOC_TYPES } = require('@medic/constants');
  const skip = ['_id', '_rev', 'type', 'refid', 'geolocation'];
  const keyShouldBeSkipped = key => skip.indexOf(key) !== -1 || /_date$/.test(key);

  const usedKeys = [];
  const emitMaybe = function (type, key, value) {
    if (usedKeys.indexOf(key) === -1 && // Not already used
      key.length > 2 // Not too short
    ) {
      usedKeys.push(key);
      emit([type, key], value);
    }
  };

  const emitField = (type, key, value, order) => {
    if (!key || !value) {
      return;
    }
    const lowerKey = key.toLowerCase();
    if (keyShouldBeSkipped(lowerKey)) {
      return;
    }
    if (typeof value === 'string') {
      const lowerValue = value.toLowerCase();
      lowerValue
        .split(/\s+/)
        .forEach(word => emitMaybe(type, word, order));
      emitMaybe(type, `${lowerKey}:${lowerValue}`, order);
    } else if (typeof value === 'number') {
      emitMaybe(type, `${lowerKey}:${value}`, order);
    }
  };

  const getType = () => {
    if (doc.type !== DOC_TYPES.CONTACT) {
      return doc.type;
    }

    return doc.contact_type;
  };

  const getTypeIndex = type => {
    const types = ['district_hospital', 'health_center', 'clinic', 'person'];
    const typeIndex = types.indexOf(type);
    if (typeIndex === -1 && doc.type === DOC_TYPES.CONTACT) {
      return type;
    }

    return typeIndex;
  };

  const type = getType();
  const idx = getTypeIndex(type);
  if (idx === -1) {
    return;
  }

  const dead = !!doc.date_of_death;
  const muted = !!doc.muted;
  const order = `${dead} ${muted} ${idx} ${doc.name && doc.name.toLowerCase()}`;
  Object
    .keys(doc)
    .forEach(key => emitField(type, key, doc[key], order));
};
