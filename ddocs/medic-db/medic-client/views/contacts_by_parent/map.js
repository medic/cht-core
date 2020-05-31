function(doc) {
  if (doc.type === 'contact' ||
      doc.type === 'clinic' ||
      doc.type === 'health_center' ||
      doc.type === 'district_hospital' ||
      doc.type === 'person') {
    var parentId = doc.parent && doc.parent._id;
    if (parentId) {
      emit([parentId, doc.contact_type || doc.type]);
    }
  }
}
