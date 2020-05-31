function(doc) {
  if (doc.type === 'data_record' && doc.form) {
    var place = doc.contact && doc.contact.parent;
    while (place) {
      if (place._id) {
        emit([ place._id ], doc.reported_date);
      }
      place = place.parent;
    }
  }
}
