function(doc) {
  var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
  var idx = types.indexOf(doc.type);
  if (idx !== -1) {
    var name = doc.name && doc.name.toLowerCase();
    var order = idx + ' ' + name;
    emit([ order ], name);
  }
}
