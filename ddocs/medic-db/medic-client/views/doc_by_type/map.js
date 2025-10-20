function(doc) {
  // if querying for contacts, data_records, or tasks, use a view
  // specific to that type
  if (doc.type !== 'contact' &&
      doc.type !== 'clinic' &&
      doc.type !== 'health_center' &&
      doc.type !== 'district_hospital' &&
      doc.type !== 'person' &&
      doc.type !== 'data_record' &&
      doc.type !== 'task' &&
      doc.type !== 'target') {
    emit([ doc.type ]);
  }
}
