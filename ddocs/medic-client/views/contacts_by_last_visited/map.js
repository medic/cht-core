// TODO: change patient_uuid to the correct new name
function(doc) {
  if (doc.type === 'data_record' &&
      doc.form &&
      doc.fields &&
      doc.fields.patient_uuid) {

    // Is a visit report about a family
    emit(doc.fields.patient_uuid, doc.reported_date);
  } else if (doc.type === 'health_center') {
    // Is a family
    emit(doc._id, 0);
  }
}
