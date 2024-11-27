function (doc) {
  var skip = ['_id', '_rev', 'type', 'refid', 'content', '_attachments'];
  var toIndex = '';

  var emitField = function (key, value) {
    if (!key || !value) {
      return;
    }

    key = key.toLowerCase().trim();
    if (skip.indexOf(key) !== -1 || /_date$/.test(key)) {
      return;
    }

    var fieldNameRegex = /^\$?[a-zA-Z][a-zA-Z0-9_]*$/g
    if (!fieldNameRegex.test(key)) {
      log(`key "${key}" doesn't pass regex - "${doc._id}"`);
    }

    if (typeof value === 'string') {
      toIndex += ' ' + value;
      index('text', key, value, { store: true });
    }

    if (typeof value === 'number') {
      index('double', key, value, { store: true });
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
