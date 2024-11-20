function (doc) {
  var skip = ['_id', '_rev', 'type', 'refid', 'content'];
  let toIndex = '';

  var emitField = function (key, value) {
    if (!key || !value) {
      return;
    }
    key = key.toLowerCase();
    if (skip.indexOf(key) !== -1 || /_date$/.test(key)) {
      return;
    }

    if (typeof value === 'string') {
      toIndex += ' ' + value;
    }
  };

  if (doc.type === 'data_record' && doc.form) {
    Object.keys(doc).forEach(function (key) {
      emitField(key, doc[key]);
    });
    if (doc.fields) {
      Object.keys(doc.fields).forEach(function (key) {
        emitField(key, doc.fields[key]);
      });
    }

    toIndex = toIndex.trim();
    if (toIndex) {
      index('text', 'default', toIndex, { store: true });
    } else {
      log(`******* empty toIndex "${toIndex}" "${doc._id}"`);
    }
  }
}
