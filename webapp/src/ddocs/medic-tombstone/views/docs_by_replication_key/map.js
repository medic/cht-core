// WARNING: If updating this function also update the corresponding view in medic ddoc
function (doc) {
  if (doc.type !== 'tombstone' || !doc.tombstone) {
    return;
  }
  var tombstone = doc.tombstone;

  var getSubject = function() {
    if (tombstone.form) {
      // report
      if (tombstone.contact && tombstone.errors && tombstone.errors.length) {
        for (var i = 0; i < tombstone.errors.length; i++) {
          // no patient found, fall back to using contact. #3437
          if (tombstone.errors[i].code === 'registration_not_found') {
            return tombstone.contact._id;
          }
        }
      }
      return (tombstone.patient_id || (tombstone.fields && tombstone.fields.patient_id)) ||
             (tombstone.place_id || (tombstone.fields && tombstone.fields.place_id)) ||
             (tombstone.contact && tombstone.contact._id);
    }
    if (tombstone.sms_message) {
      // incoming message
      return tombstone.contact && tombstone.contact._id;
    }
    if (tombstone.kujua_message) {
      // outgoing message
      return tombstone.tasks &&
             tombstone.tasks[0] &&
             tombstone.tasks[0].messages &&
             tombstone.tasks[0].messages[0] &&
             tombstone.tasks[0].messages[0].contact &&
             tombstone.tasks[0].messages[0].contact._id;
    }
  };
  switch (tombstone.type) {
    case 'data_record':
      var subject = getSubject() || '_unassigned';
      var value = {};
      if (tombstone.form && tombstone.contact) {
        value.submitter = tombstone.contact._id;
      }
      return emit(subject, value);
    case 'clinic':
    case 'district_hospital':
    case 'health_center':
    case 'person':
      return emit(tombstone._id, {});
  }
}
