function(doc) {
  if (doc.contact_id) {
    emit(['contact_id', doc.contact_id]);
  }
  if (doc.facility_id) {
    emit(['facility_id', doc.facility_id]);
  }
}
