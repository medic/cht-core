function(doc) {
  if (doc.type === 'person' && doc.simprints_id) {
    emit(doc.simprints_id);
  }
}
