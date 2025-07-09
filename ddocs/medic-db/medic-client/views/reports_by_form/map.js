function(doc) {
  if (doc.type === 'data_record') {
    if (doc.form) {
      emit([doc.form], doc.reported_date);
    } else {
      emit(['message']);
    }
  }
}
