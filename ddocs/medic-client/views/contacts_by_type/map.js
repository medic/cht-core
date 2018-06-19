function(doc) {
  var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
  var idx = types.indexOf(doc.type);
  var dead = !!doc.date_of_death;
  if (idx !== -1) {
    var order = dead + ' ' + idx + ' ' + (doc.name && doc.name.toLowerCase());
    emit([ doc.type ], order);
  }
}
