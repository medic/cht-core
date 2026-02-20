function(doc) {
  if (doc.phone) {
    var types = [ 'contact', 'district_hospital', 'health_center', 'clinic', 'person' ];
    if (types.indexOf(doc.type) !== -1) {
      emit(doc.phone);
    }
  }
}
