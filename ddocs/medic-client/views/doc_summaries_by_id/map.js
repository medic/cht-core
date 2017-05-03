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
      lineage: getLineage(doc.contact && doc.contact.parent)
    });
  } else if (doc.type === 'clinic' ||
      doc.type === 'district_hospital' ||
      doc.type === 'health_center' ||
      doc.type === 'person') { // contact
    emit(doc._id, {
      _rev: doc._rev,
      name: doc.name || phone,
      phone: doc.phone || (doc.contact && doc.contact.phone),
      type: doc.type,
      contact: doc.contact && doc.contact._id,
      lineage: getLineage(doc.parent)
    });
  }
}
