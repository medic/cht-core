function(doc) {
  // emit tombstones so we don't reuse shortcodes
  if (doc.type === 'tombstone' && doc.tombstone) {
    doc = doc.tombstone;
  }
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
