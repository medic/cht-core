function(doc) {
  [
    'contact_id',
    'oidc_username'
  ].forEach(function(property) {
    if (doc[property]) {
      emit([property, doc[property]]);
    }
  });

  if (doc.facility_id) {
    var facilityIds = Array.isArray(doc.facility_id) ? doc.facility_id : [doc.facility_id];
    facilityIds.forEach(function(facilityId) {
      emit(['facility_id', facilityId]);
    });
  }
}
