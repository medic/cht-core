function(doc) {
  var DOC_IDS_WARN_LIMIT = 10000;

  if (doc.count > DOC_IDS_WARN_LIMIT) {
    emit(doc.user);
  }
}
