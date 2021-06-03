function(doc) {
  if (doc._id.indexOf('connected-user-') === 0) {
    emit(doc.timestamp);
  }
}
