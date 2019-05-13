function(doc) {
  var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
  var idx = types.indexOf(doc.type);
  if (idx !== -1) {
    var dead = !!doc.date_of_death;
    var muted = !!doc.muted;
    var name = doc.name && doc.name.toLowerCase();
    var order = dead + ' ' + muted + ' ' + idx + ' ' + name;
    emit([ order ], name);
  }
}
