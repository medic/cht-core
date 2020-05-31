// NB: This returns *registrations* for patients. If patients are created by
//     means other then sending in a registration report (eg created in the UI)
//     they will not show up in this view.
//
//     For a view with all patients by their shortcode, use:
//        medic/patient_by_patient_shortcode_id
function(doc) {
  var patientId = doc.patient_id || (doc.fields && doc.fields.patient_id);
  if (doc.form &&
      doc.type === 'data_record' &&
      (!doc.errors || doc.errors.length === 0) &&
      patientId) {
    emit(String(patientId));
  }
}
