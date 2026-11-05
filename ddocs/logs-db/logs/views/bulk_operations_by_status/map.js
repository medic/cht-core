function(doc) {
  if (doc._id.indexOf('bulk-operation:') === 0) {
    emit(doc.status);
  }
}
