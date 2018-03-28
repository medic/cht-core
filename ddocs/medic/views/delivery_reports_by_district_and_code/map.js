function(doc) {
  if (doc.type === 'data_record' &&
      doc.form === 'D' &&
      !(doc.errors && doc.errors.length) &&
      doc.fields &&
      doc.fields.delivery_code) {
    var place = doc.contact;
    var placeId;
    while (place) {
      placeId = place._id;
      place = place.parent;
    }
    var code = doc.fields.delivery_code.toUpperCase();
    if (placeId) {
      emit([placeId, code]);
    }
    emit(['_admin', code]);
  }
}
