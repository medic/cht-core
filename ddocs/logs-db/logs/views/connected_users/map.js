function(doc) {
  if (doc.user && doc.timestamp) {
    emit(doc.user, doc.timestamp);
  }
}
