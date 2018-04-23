function(doc) {
  var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
  var idx = types.indexOf(doc.type);
  var dead = !!doc.date_of_death;
  if (idx !== -1) {
    var name = doc.name && doc.name.toLowerCase();
    var order = dead + ' ' + idx + ' ' + name;
    emit([ order ], name);
  }
}
