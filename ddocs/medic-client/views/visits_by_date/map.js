function(doc) {
  if (doc.type === 'data_record' &&
      doc.form &&
      doc.fields &&
      doc.fields.visited_contact_uuid) {

    // Is a visit report about a family
    emit(doc.reported_date, doc.fields.visited_contact_uuid);
  }
}
