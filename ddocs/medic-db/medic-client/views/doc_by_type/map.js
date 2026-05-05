function(doc) {
  var indexed_types = ['form', 'user-settings'];
  if (indexed_types.indexOf(doc.type) !== -1) {
    emit([ doc.type ]);
  }
}
