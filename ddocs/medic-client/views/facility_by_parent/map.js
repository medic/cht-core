function(doc) {
  if (doc.type === 'clinic' ||
    doc.type === 'health_center' ||
    doc.type === 'district_hospital' ||
    doc.type === 'person') {
    emit([doc.parent._id, doc.name, doc.type], true);
  }
}
