// Mostly used for exporting records
function(doc) {
  if (doc.type === 'data_record') {
    var valid = !doc.errors || doc.errors.length === 0;
    var form = doc.form;

    emit([doc.reported_date]);

    if (form) {
      emit([valid, form, doc.reported_date]);
      emit([valid, '*', doc.reported_date]);
    }

    var parent = doc.contact;
    while(parent) {
      if (parent._id) {
        emit([parent._id, doc.reported_date]);
        if (form) {
          emit([valid, parent._id, form, doc.reported_date]);
          emit([valid, parent._id, '*', doc.reported_date]);
        }
      }
      parent = parent.parent;
    }
  }
}
