function (doc) {
  var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
  if (types.indexOf(doc.type) !== -1) {
    if (doc.contact) {
      var primaryContact = typeof doc.contact === 'object' ? doc.contact._id : doc.contact;
      emit(primaryContact);
    }
  }
}
