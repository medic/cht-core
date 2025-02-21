module.exports.map = (doc) => {
  const skip = [ '_id', '_rev', 'type', 'refid', 'content' ];
  const keyShouldBeSkipped = key => skip.indexOf(key) !== -1 || /_date$/.test(key);

  const usedKeys = [];
  const emitMaybe = (key, value) => {
    if (usedKeys.indexOf(key) === -1 && // Not already used
      key.length > 2 // Not too short
    ) {
      usedKeys.push(key);
      emit([key], value);
    }
  };

  const emitField = (key, value, reportedDate) => {
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
        .forEach((word) => emitMaybe(word, reportedDate));
      emitMaybe(`${lowerKey}:${lowerValue}`, reportedDate);
    } else if (typeof value === 'number') {
      emitMaybe(`${lowerKey}:${value}`, reportedDate);
    }
  };

  if (doc.type !== 'data_record' || !doc.form) {
    return;
  }

  Object
    .keys(doc)
    .forEach((key) => emitField(key, doc[key], doc.reported_date));
  if (doc.fields) {
    Object
      .keys(doc.fields)
      .forEach((key) => emitField(key, doc.fields[key], doc.reported_date));
  }
  if (doc.contact && doc.contact._id) {
    emitMaybe(`contact:${doc.contact._id.toLowerCase()}`, doc.reported_date);
  }
};
