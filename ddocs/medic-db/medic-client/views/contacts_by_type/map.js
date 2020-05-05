function(doc) {
  var tombstone = false;
  if (doc.type === 'tombstone' && doc.tombstone) {
    tombstone = true;
    doc = doc.tombstone;
  }
  var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
  var idx;
  var type;
  if (doc.type === 'contact') {
    type = doc.contact_type;
    idx = types.indexOf(type);
    if (idx === -1) {
      idx = type;
    }
  } else {
    type = doc.type;
    idx = types.indexOf(type);
  }
  if (tombstone) {
    type = 'tombstone-' + type;
  }
  if (idx !== -1) {
    var dead = !!doc.date_of_death;
    var muted = !!doc.muted;
    var order = dead + ' ' + muted + ' ' + idx + ' ' + (doc.name && doc.name.toLowerCase());
    emit([ type ], order);
  }
}
