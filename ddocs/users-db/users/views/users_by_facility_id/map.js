function(doc) {
  if (doc.facility_id) {
    emit(doc.facility_id);
  }
}
