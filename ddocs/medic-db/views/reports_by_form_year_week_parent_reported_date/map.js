function (doc) {
  if (doc.type === 'data_record' &&
      doc.contact &&
      doc.contact.parent &&
      doc.fields &&
      doc.fields.year &&
      (doc.fields.week || doc.fields.week_number) &&
      doc.form &&
      doc.reported_date) {
    emit([
      doc.form,
      doc.fields.year,
      doc.fields.week || doc.fields.week_number,
      doc.contact.parent._id,
      doc.reported_date
    ]);
  }
}
