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
      // index('text', key, value, { store: true });
    }

    if (typeof value === 'number') {
      // index('double', key, value, { store: true });
    }

    const fieldNameRegex = /^\$?[a-zA-Z][a-zA-Z0-9_]*$/g
    if (fieldNameRegex.test(key)) {
      console.log(`key "${key}" doesn't pass regex`);
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
    if (doc.contact && doc.contact._id) {
      // index('text', 'contact', doc.contact._id.toLowerCase(), { store: true });
      /*const fieldNameRegex = /^\$?[a-zA-Z][a-zA-Z0-9_]*$/g
      if (fieldNameRegex.test('contact')) {
        console.log(`key "contact" doesn't pass regex`);
      }*/
    }
  }

  toIndex = toIndex.trim();
  if (toIndex) {
    index('text', 'default', toIndex, { store: true });
  }
}
