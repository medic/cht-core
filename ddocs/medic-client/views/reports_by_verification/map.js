function(doc) {
  if (doc.type === 'data_record' && doc.form) {
    emit([doc.verified === true], doc.reported_date);
  }
}