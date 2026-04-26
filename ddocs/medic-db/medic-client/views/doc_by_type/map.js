function(doc) {
  var INDEXED_TYPES = ['user-settings', 'translations', 'form', 'meta'];
  if (INDEXED_TYPES.indexOf(doc.type) !== -1) {
    emit([ doc.type ]);
  }
}
