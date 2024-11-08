function(doc) {
  if (doc.type === 'contact' ||
      doc.type === 'clinic' ||
      doc.type === 'health_center' ||
      doc.type === 'district_hospital' ||
      doc.type === 'person') {
    var type = doc.type === 'contact' ? doc.contact_type : doc.type;
    var parentId = doc.parent && doc.parent._id;
    if (parentId) {
      emit([parentId, type]);
    }
  }
}
