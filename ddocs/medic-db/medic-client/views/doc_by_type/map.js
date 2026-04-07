function(doc) {
  var excluded = [
    'task', 'data_record', 'contact', 'target', 'telemetry',
    'district_hospital', 'health_center', 'clinic', 'person'
  ];
  if (excluded.indexOf(doc.type) === -1) {
    emit([ doc.type ]);
  }
}
