function(doc) {
  if (doc.phone) {
    var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
    if (types.indexOf(doc.type) !== -1) {
      emit(doc.phone);
    }
  }
}
