function(doc) {
  if (doc.type === 'data_record' &&
      doc.form === 'V' &&
      !(doc.errors && doc.errors.length) &&
      doc.fields) {

    var getDistrictId = function(facility) {
      while (facility && facility.type !== 'district_hospital') {
        facility = facility.parent;
      }
      return facility && facility._id;
    };

    var dh = getDistrictId(doc.contact);
    emit([dh, doc.fields.patient_id]);
    emit(['_admin', doc.fields.patient_id]);
  }
}
