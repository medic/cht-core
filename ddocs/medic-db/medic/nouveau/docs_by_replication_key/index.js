function(doc) {

  if (doc._id === 'resources' ||
      doc._id === 'branding' ||
      doc._id === 'partners' ||
      doc._id === 'service-worker-meta' ||
      doc._id === 'zscore-charts' ||
      doc._id === 'settings' ||
      doc._id === 'privacy-policies' ||
      doc.type === 'form' ||
      doc.type === 'translations') {
    index('string', 'key', '_all', { store: true });
    return;
  }

  var getSubject = function() {
    if (doc.form) {
      // report
      if (doc.contact && doc.errors && doc.errors.length) {
        for (var i = 0; i < doc.errors.length; i++) {
          // invalid or no patient found, fall back to using contact. #3437
          if (doc.errors[i].code === 'registration_not_found' ||
              doc.errors[i].code === 'invalid_patient_id') {
            return doc.contact._id;
          }
        }
      }
      return (doc.patient_id || (doc.fields && doc.fields.patient_id)) ||
             (doc.place_id || (doc.fields && doc.fields.place_id)) ||
             (doc.fields && doc.fields.patient_uuid) ||
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
  index('string', 'type', doc.type, { store: true });
  switch (doc.type) {
  case 'data_record':
    var subject = getSubject() || '_unassigned';
    index('string', 'key', subject, { store: true });
    if (doc.form && doc.contact) {
      // value.submitter = doc.contact._id;
      index('string', 'submitter',  doc.contact._id, { store: true });
    }
    if (doc.fields && doc.fields.private) {
      index('string', 'private', 'true', { store: true });
    }
    if (doc.fields &&
        doc.fields.needs_signoff &&
        doc.contact
    ) {
      index('string', 'needs_signoff', 'true', { store: true });
      var contact = doc.contact;
      while (contact) {
        if (contact._id && contact._id !== subject) {
          index('string', 'key', contact._id, { store: true });
        }
        contact = contact.parent;
      }
    }
    return;
  case 'task':
    return index('string', 'key', doc.user, { store: true });
  case 'target':
    return index('string', 'key', doc.owner, { store: true });
  case 'contact':
  case 'clinic':
  case 'district_hospital':
  case 'health_center':
  case 'person':
    return index('string', 'key', doc._id, { store: true });
  }
}
