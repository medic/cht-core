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

  const indexableFields = ['key', 'type', 'subject'];

  const indexMaybe = (fieldName, value) => {
    if (value === undefined) {
      return;
    }
    // ensure we index strings, not booleans or other types
    value = value.toString();

    if (indexableFields.includes(fieldName)) {
      index('string', fieldName, value, { store: true });
    } else {
      index('stored', fieldName, value);
    }
  }

  const getSubject = () => {
    if (doc.form) {
      // report
      if (doc.contact && doc.errors && doc.errors.length) {
        for (let i = 0; i < doc.errors.length; i++) {
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

  indexMaybe( 'type', doc.type);
  switch (doc.type) {
  case 'data_record': {
    const subject = getSubject() || '_unassigned';
    indexMaybe('subject', subject);
    indexMaybe('key', subject);
    if (doc.form && doc.contact) {
      indexMaybe('submitter', doc.contact._id);
    }
    if (doc.fields && doc.fields.private) {
      indexMaybe('private', true);
    }
    if (doc.fields &&
        doc.fields.needs_signoff &&
        doc.contact
    ) {
      indexMaybe('needs_signoff', true);
      let contact = doc.contact;
      while (contact) {
        if (contact._id && contact._id !== subject) {
          indexMaybe('key', contact._id);
        }
        contact = contact.parent;
      }
    }
    return;
  }
  case 'task':
    return indexMaybe('key', doc.user);
  case 'target':
    return indexMaybe('key', doc.owner);
  case 'contact':
  case 'clinic':
  case 'district_hospital':
  case 'health_center':
  case 'person':
    return indexMaybe('key', doc._id);
  }
}
