function(doc) {
  if (doc.type === 'data_record' && doc.form) {
    var depth = 0;
    emit([ doc._id, depth++ ]);
    var parent = doc.contact;
    while (parent) {
      emit([ doc._id, depth++ ], { _id: parent._id });
      parent = parent.parent;
    }
  }
}
