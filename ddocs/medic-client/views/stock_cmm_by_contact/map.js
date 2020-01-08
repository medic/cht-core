function(doc) {
  if (doc.type === 'data_record' &&
      doc.form &&
      doc.contact &&
      doc.contact._id &&
      doc.reported_date &&
      doc.fields &&
      doc.fields.stock_delta) {

    // cmm is computed over past 6 months
    var months6Ago = new Date();
    months6Ago.setMonth(months6Ago.getMonth() - 6);

    if (doc.reported_date > months6Ago) {
      var reportDate = new Date(doc.reported_date);

      emit(doc.contact._id, { 
        stock_delta: doc.fields.stock_delta,
        date: reportDate.getFullYear() + reportDate.getMonth()
      });
    }

  }
}
