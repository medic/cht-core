function(doc) {
  if (doc.type === 'data_record' &&
      doc.form &&
      doc.fields &&
      doc.fields.visited_contact_uuid) {

    var visited_date = doc.fields.visited_date ? Date.parse(doc.fields.visited_date) : doc.reported_date;

    // Is a visit report about a family
    emit(visited_date, doc.fields.visited_contact_uuid);
    emit([doc.fields.visited_contact_uuid, visited_date]);
  }
}
