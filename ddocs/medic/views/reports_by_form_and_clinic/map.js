function(doc) {
  if (doc.type === 'data_record' &&
      doc.form &&
      doc.contact &&
      doc.contact.parent) {
    emit([doc.form, doc.contact.parent._id]);
  }
}
