function(doc) {
  var districtId = doc.parent && doc.parent.parent && doc.parent.parent._id;
  if (doc.type === 'clinic' || (doc.type === 'contact' && districtId)) {
    var healthCenterId = doc.parent && doc.parent._id;
    emit([ districtId, healthCenterId, doc._id, 0 ]);
    if (doc.contact && doc.contact._id) {
      emit([ districtId, healthCenterId, doc._id, 1 ], { _id: doc.contact._id });
    }
    var index = 2;
    var parent = doc.parent;
    while(parent) {
      if (parent._id) {
        emit([ districtId, healthCenterId, doc._id, index++ ], { _id: parent._id });
      }
      parent = parent.parent;
    }
  }
}
