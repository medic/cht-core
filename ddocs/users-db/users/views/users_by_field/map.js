function(doc) {
  if (doc.contact_id) {
    emit(['contact_id', doc.contact_id]);
  }
  if (doc.facility_id) {
    var facilityIds = Array.isArray(doc.facility_id) ? doc.facility_id : [doc.facility_id];
    facilityIds.forEach(function(facilityId) {
      emit(['facility_id', facilityId]);
    });
  }
}
