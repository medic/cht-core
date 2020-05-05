function(doc) {
  if (
    doc.dhis &&
    ['contact', 'person', 'clinic', 'health_center', 'district_hospital'].indexOf(doc.type) !== -1
  ) {
    if (Array.isArray(doc.dhis)) {
      for (var i = 0; i < doc.dhis.length; ++i) {
        emit(doc.dhis[i].orgUnit);
      }
    } else {
      emit(doc.dhis.orgUnit);
    }
  }
}
