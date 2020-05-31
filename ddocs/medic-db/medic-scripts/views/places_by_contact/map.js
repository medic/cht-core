function(doc) {
  if (
    doc.contact &&
    doc.contact._id &&
    (
      doc.type === 'contact' ||
      doc.type === 'clinic' ||
      doc.type === 'health_center' ||
      doc.type === 'district_hospital'
    )
  ) {
    emit(doc.contact._id);
  }
}
