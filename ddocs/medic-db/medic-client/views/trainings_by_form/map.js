function(doc) {
  if (doc.type === 'data_training' && doc.form) {
    emit([doc.form], doc.reported_date);
  }
}
