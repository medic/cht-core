// NB: This returns *registrations* for contacts. If contacts are created by
//     means other then sending in a registration report (eg created in the UI)
//     they will not show up in this view.
//
//     For a view with all patients by their shortcode, use:
//        medic/docs_by_shortcode
function(doc) {
  var patientId = doc.patient_id || (doc.fields && doc.fields.patient_id);
  var placeId = doc.place_id || (doc.fields && doc.fields.place_id);

  if (!doc.form || doc.type !== 'data_record' || (doc.errors && doc.errors.length)) {
    return;
  }

  if (patientId) {
    emit(String(patientId));
  }

  if (placeId) {
    emit(String(placeId));
  }
}
