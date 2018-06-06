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

  var isMissingSubjectError = function(error) {
    if (error.code !== 'sys.missing_fields' || !error.fields) {
      return false;
    }

    if (error.fields.indexOf('patient_id') !== -1 ||
      error.fields.indexOf('patient_name') !== -1 ||
      error.fields.indexOf('place_id') !== -1) {
      return true;
    }

    return false;
  };

  var getSubject = function(doc) {
    var subject = {};

    if (doc.patient_id || (doc.fields && doc.fields.patient_id) || doc.place_id) {
      subject.value = doc.patient_id || (doc.fields && doc.fields.patient_id) || doc.place_id;
      subject.type = 'reference';
    } else if (doc.fields && doc.fields.place_id) {
      subject.value = doc.fields.place_id;
      subject.type = 'id';
    } else if (doc.fields && doc.fields.patient_name) {
      subject.value = doc.fields.patient_name;
      subject.type = 'name';
    } else if (doc.errors) {
      doc.errors.forEach(function(error) {
        if (isMissingSubjectError(error)) {
          subject.type = 'unknown';
        }
      });
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
      verified_valid: doc.verified_valid,
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
