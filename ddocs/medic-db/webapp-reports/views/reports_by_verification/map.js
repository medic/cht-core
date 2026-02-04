function(doc) {
  if (doc.type === 'data_record' && doc.form) {
    emit([doc.verified], doc.reported_date);
  }
}
