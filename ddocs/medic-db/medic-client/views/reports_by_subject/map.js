function(doc) {
  if (doc.type === 'data_record' && doc.form) {
    var emitted = {};
    var emitField = function(obj, field) {
      var value = obj[field];
      if (value && !emitted[value]) {
        emitted[value] = true;
        emit(value, doc.reported_date);
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
