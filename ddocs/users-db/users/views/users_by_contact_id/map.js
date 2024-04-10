function(doc) {
  if (doc.contact_id) {
    emit(doc.contact_id);
  }
}
