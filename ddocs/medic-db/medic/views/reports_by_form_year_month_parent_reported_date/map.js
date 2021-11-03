function (doc) {
  if (doc.type === 'data_record' &&
      doc.contact &&
      doc.contact.parent &&
      doc.fields &&
      doc.fields.year &&
      (doc.fields.month || doc.fields.month_num) &&
      doc.form &&
      doc.reported_date) {
    emit([
      doc.form,
      doc.fields.year,
      doc.fields.month || doc.fields.month_num,
      doc.contact.parent._id,
      doc.reported_date
    ]);
  }
}
