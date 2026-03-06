function(doc) {
  if (doc.type === 'contact' ||
      doc.type === 'clinic' ||
      doc.type === 'health_center' ||
      doc.type === 'district_hospital' ||
      doc.type === 'person') {
    var parentId = doc.parent && doc.parent._id;
    var type = doc.type === 'contact' ? doc.contact_type : doc.type;
    if (parentId) {
      emit([parentId, type]);
    }
  }
}
