function(doc) {
  var types = ['meta', 'form', 'translations', 'user-settings'];
  if (types.indexOf(doc.type) !== -1) {
    emit([doc.type]);
  }
}
