function(doc) {
  if (doc.type === 'data_record' &&
      doc.form &&
      doc.fields &&
      doc.fields.visited_contact_uuid) {

    // Is a visit report about a family
    emit(doc.fields.visited_contact_uuid, doc.reported_date);
  } else if (doc.type === 'clinic') {
    // Is a family
    emit(doc._id, 0);
  }
}
