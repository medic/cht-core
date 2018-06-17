function (doc) {
  if (doc._id === 'resources' ||
      doc._id === 'appcache' ||
      doc._id === 'zscore-charts' ||
      doc._id === 'settings' ||
      doc.type === 'form' ||
      doc.type === 'translations') {
    return emit('_all', {});
  }

  if (doc.type === 'tombstone' && doc.tombstone) {
    doc = doc.tombstone;
  }

  var getSubject = function() {
    if (doc.form) {
      // report
      if (doc.contact && doc.errors && doc.errors.length) {
        for (var i = 0; i < doc.errors.length; i++) {
          // no patient found, fall back to using contact. #3437
          if (doc.errors[i].code === 'registration_not_found') {
            return doc.contact._id;
          }
        }
      }
      return (doc.patient_id || (doc.fields && doc.fields.patient_id)) ||
             (doc.place_id || (doc.fields && doc.fields.place_id)) ||
             (doc.contact && doc.contact._id);
    }
    if (doc.sms_message) {
      // incoming message
      return doc.contact && doc.contact._id;
    }
    if (doc.kujua_message) {
      // outgoing message
      return doc.tasks &&
             doc.tasks[0] &&
             doc.tasks[0].messages &&
             doc.tasks[0].messages[0] &&
             doc.tasks[0].messages[0].contact &&
             doc.tasks[0].messages[0].contact._id;
    }
  };
  switch (doc.type) {
    case 'data_record':
      var subject = getSubject() || '_unassigned';
      var value = {};
      if (doc.form && doc.contact) {
        value.submitter = doc.contact._id;
      }
      emit(subject, value);
      if (doc.fields &&
          doc.fields.needs_signoff &&
          doc.contact &&
          doc.contact._id &&
          doc.contact._id !== subject
      ) {
        emit(doc.contact._id, value);
      }
      return;
    case 'clinic':
    case 'district_hospital':
    case 'health_center':
    case 'person':
      return emit(doc._id, {});
  }
}
