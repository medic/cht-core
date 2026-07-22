function(doc) {
  var indexedTypes = ['form', 'user-settings'];
  if (indexedTypes.indexOf(doc.type) !== -1) {
    emit([ doc.type ]);
  }
}
