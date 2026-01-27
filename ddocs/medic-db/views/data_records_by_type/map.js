function(doc) {
  if (doc.type === 'data_record') {
    emit(doc.form ? 'report' : 'message');
  }
}
