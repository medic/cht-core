function(doc) {
  if (doc.type === 'data_training' && doc.form && doc.contact) {
    emit([doc.contact._id], doc.form);
  }
}
