function(doc) {
  var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
  var idx;
  if (doc.type === 'contact') {
    idx = types.indexOf(doc.contact_type);
    if (idx === -1) {
      idx = doc.contact_type;
    }
  } else {
    idx = types.indexOf(doc.type);
  }
  if (idx !== -1) {
    var dead = !!doc.date_of_death;
    var muted = !!doc.muted;
    var order = dead + ' ' + muted + ' ' + idx + ' ' + (doc.name && doc.name.toLowerCase());
    emit([ doc.contact_type || doc.type ], order);
  }
}
