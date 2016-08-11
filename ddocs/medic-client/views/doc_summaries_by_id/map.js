function(doc) {
  var getPlaceHierarchy = function(contact) {
    if (!contact) {
      return;
    }
    var place = contact.parent;
    var parts = [];
    while (place) {
      if (place.name) {
        parts.push(place.name);
      }
      place = place.parent;
    }
    return parts;
  };

  if (doc.type === 'data_record' && doc.form) { // report
    var from = (doc.contact && doc.contact.name) ||
               doc.from ||
               doc.sent_by;
    emit([ doc._id ], {
      _rev: doc._rev,
      from: from,
      phone: doc.contact && doc.contact.phone,
      form: doc.form,
      read: doc.read,
      valid: !doc.errors || !doc.errors.length,
      verified: doc.verified,
      reported_date: doc.reported_date,
      place: getPlaceHierarchy(doc.contact)
    });
  } else if (doc.type === 'clinic' ||
      doc.type === 'district_hospital' ||
      doc.type === 'health_center' ||
      doc.type === 'person') { // contact
    var place = doc.parent;
    var parts = [];
    while (place) {
      if (place.name) {
        parts.push(place.name);
      }
      place = place.parent;
    }
    var phone = doc.phone || doc.contact && doc.contact.phone;
    var name = doc.name || phone;
    emit([ doc._id ], {
      _rev: doc._rev,
      name: name,
      phone: phone,
      type: doc.type,
      place: getPlaceHierarchy(doc)
    });
  }
}
