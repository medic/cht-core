function(doc) {
  if (doc.type === 'data_record' && doc.form) {
    var emitField = function(obj, field) {
      if (obj[field]) {
        emit(obj[field], doc.reported_date);
      }
    };

    emitField(doc, 'patient_id');
    emitField(doc, 'place_id');
    emitField(doc, 'case_id');

    if (doc.fields) {
      emitField(doc.fields, 'patient_id');
      emitField(doc.fields, 'place_id');
      emitField(doc.fields, 'case_id');
      emitField(doc.fields, 'patient_uuid');
      emitField(doc.fields, 'place_uuid');
    }
  }
}
