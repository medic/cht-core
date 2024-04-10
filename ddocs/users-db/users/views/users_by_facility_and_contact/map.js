function(doc) {
  if (doc.facility_id && doc.contact_id) {
    emit([ doc.facility_id, doc.contact_id ]);
  }
  if (doc.facility_id) {
    emit(doc.facility_id);
  }
  if (doc.contact_id) {
    emit(doc.contact_id);
  }
}
