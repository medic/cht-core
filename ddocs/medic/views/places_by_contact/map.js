function(doc) {
  if ((doc.type === 'clinic' || doc.type === 'health_center' || doc.type === 'district_hospital') &&
      doc.contact &&
      doc.contact._id) {
    emit(doc.contact._id);
  }
}
