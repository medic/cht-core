function(doc) {
  if (doc.type === 'data_record' && doc.form) {
    emit([doc.form], doc.reported_date);
  }
}