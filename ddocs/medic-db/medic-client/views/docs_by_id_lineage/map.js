function(doc) {

  var emitLineages = function(contact, depth) {
    while (contact && contact._id) {
      emit([ doc._id, depth++ ], { _id: contact._id });
      contact = contact.parent;
    }
  };

  var types = [ 'contact', 'district_hospital', 'health_center', 'clinic', 'person' ];

  if (types.indexOf(doc.type) !== -1) {
    // contact
    emitLineages(doc, 0);
  } else if (doc.type === 'data_record' && doc.form) {
    // report
    emit([ doc._id, 0 ]);
    emitLineages(doc.contact, 1);
  }
}
