function(doc) {
  var getLineage = function(contact) {
    var parts = [];
    while (contact) {
      if (contact._id) {
        parts.push(contact._id);
      }
      contact = contact.parent;
    }
    return parts;
  };

  var getSubject = function(doc) {
    var subject = {};

    if (doc.fields && doc.fields.hasOwnProperty('patient_uuid')) {
      subject.value = doc.fields.patient_uuid;
      subject.type = 'id';
    } else if (doc.hasOwnProperty('patient_id') || (doc.fields && doc.fields.hasOwnProperty('patient_id'))) {
      subject.value = doc.patient_id || (doc.fields && doc.fields.patient_id);
      subject.type = 'reference';
    } else if (doc.fields && doc.fields.hasOwnProperty('place_id')) {
      subject.value = doc.fields.place_id;
      subject.type = 'id';
    } else if (doc.hasOwnProperty('place_id')) {
      subject.value = doc.place_id;
      subject.type = 'reference';
    } else if (doc.fields && doc.fields.hasOwnProperty('patient_name')) {
      subject.value = doc.fields.patient_name;
      subject.type = 'name';
    }

    return subject;
  };

  if (doc.type === 'data_record' && doc.form) { // report
    emit(doc._id, {
      _rev: doc._rev,
      from: doc.from || doc.sent_by,
      phone: doc.contact && doc.contact.phone,
      form: doc.form,
      read: doc.read,
      valid: !doc.errors || !doc.errors.length,
      verified: doc.verified,
      reported_date: doc.reported_date,
      contact: doc.contact && doc.contact._id,
      lineage: getLineage(doc.contact && doc.contact.parent),
      subject: getSubject(doc)
    });
  } else if (doc.type === 'clinic' ||
      doc.type === 'district_hospital' ||
      doc.type === 'health_center' ||
      doc.type === 'person') { // contact
    emit(doc._id, {
      _rev: doc._rev,
      name: doc.name || doc.phone,
      phone: doc.phone,
      type: doc.type,
      contact: doc.contact && doc.contact._id,
      lineage: getLineage(doc.parent),
      simprints_id: doc.simprints_id,
      date_of_death: doc.date_of_death
    });
  }
}
