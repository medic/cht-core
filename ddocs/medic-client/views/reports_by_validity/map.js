function(doc) {
  if (doc.type === 'data_record' && doc.form) {
    emit([!doc.errors || doc.errors.length === 0], doc.reported_date);
  }
}