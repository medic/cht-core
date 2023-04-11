// WARNING: This is a copy of the GetSummaries service
// with some minor modifications and needs to be kept in sync until
// this workaround is no longer needed.
// https://github.com/medic/medic/issues/4666

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
      error.fields.indexOf('patient_uuid') !== -1 ||
      error.fields.indexOf('patient_name') !== -1 ||
      error.fields.indexOf('place_id') !== -1) {
      return true;
    }

    return false;
  };

  var getSubject = function(doc) {
    var subject = {};
    var reference = doc.patient_id ||
                    (doc.fields && doc.fields.patient_id) ||
                    (doc.fields && doc.fields.patient_uuid) ||
                    doc.place_id ||
                    (doc.fields && doc.fields.place_id);

    var patientName = doc.fields && doc.fields.patient_name;
    if (patientName) {
      subject.name = patientName;
    }

    if (reference) {
      subject.value = reference;
      subject.type = 'reference';
    } else if (patientName) {
      subject.value = patientName;
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
      reported_date: doc.reported_date,
      contact: doc.contact && doc.contact._id,
      lineage: getLineage(doc.contact && doc.contact.parent),
      subject: getSubject(doc),
      case_id: doc.case_id || (doc.fields && doc.fields.case_id)
    });
  } else if (doc.type === 'contact' ||
      doc.type === 'clinic' ||
      doc.type === 'district_hospital' ||
      doc.type === 'health_center' ||
      doc.type === 'person') { // contact
    emit(doc._id, {
      _rev: doc._rev,
      name: doc.name || doc.phone,
      phone: doc.phone,
      type: doc.type,
      contact_type: doc.contact_type,
      contact: doc.contact && doc.contact._id,
      lineage: getLineage(doc.parent),
      date_of_death: doc.date_of_death,
      muted: doc.muted
    });
  }
}
