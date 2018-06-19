function(doc) {
  if (doc.type === 'data_record' && doc.form) {
    emit([doc.reported_date], doc.reported_date);
  }
}