function(doc) {
  var idx = -1;
  var types = [ 'district_hospital', 'health_center', 'clinic', 'person', 'contact' ];
  if (doc.type === 'contact') {
    idx = doc.contact_type;
  } else {
    idx = types.indexOf(doc.type);
  }
  if (idx !== -1) {
    var dead = !!doc.date_of_death;
    var order = dead + ' ' + muted + ' ' + idx + ' ' + (doc.name && doc.name.toLowerCase());
    emit([ doc.contact_type || doc.type ], order);
  }
}
