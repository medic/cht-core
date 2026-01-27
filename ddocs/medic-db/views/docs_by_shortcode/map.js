function(doc) {
  if (doc.place_id) {
    emit(doc.place_id);
  }
  if (doc.patient_id) {
    emit(doc.patient_id);
  }
  if (doc.case_id) {
    emit(doc.case_id);
  }
}
