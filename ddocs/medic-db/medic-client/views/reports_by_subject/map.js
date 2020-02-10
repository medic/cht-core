function(doc) {
  if (doc.type === 'data_record' && doc.form) {
    var patient = doc.patient_id || (doc.fields &&
          (doc.fields.patient_id || doc.fields.patient_uuid));
    if (patient) {
      emit([ patient ], doc.reported_date);
    }
    var place = doc.place_id || (doc.fields && doc.fields.place_id);
    if (place) {
      emit([ place ], doc.reported_date);
    }
  }
}
