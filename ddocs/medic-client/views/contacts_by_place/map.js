function(doc) {
  var types = [ 'district_hospital', 'health_center', 'clinic', 'person' ];
  var idx = types.indexOf(doc.type);
  if (idx !== -1) {
    var place = doc.parent;
    var order = idx + ' ' + (doc.name && doc.name.toLowerCase());
    while (place) {
      if (place._id) {
        emit([ place._id ], order);
      }
      place = place.parent;
    }
  }
}
