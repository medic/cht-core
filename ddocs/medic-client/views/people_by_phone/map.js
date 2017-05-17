function(doc) {
  if (doc.phone) {
    emit(doc.phone);
  }
}
