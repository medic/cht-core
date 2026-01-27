function(doc) {
  if (doc.type === 'data_record' &&
      doc.form &&
      doc.contact &&
      doc.contact.parent) {
    var value = typeof doc.reported_date === 'number' ? doc.reported_date : 0;
    emit([doc.form, doc.contact.parent._id], value);
  }
}
