// data record must adhere to property name of `month`
function(doc) {
  if (doc.type === 'data_record' &&
      doc.form &&
      doc.fields &&
      doc.fields.year &&
      doc.fields.month) {
    var year = parseInt(doc.fields.year, 10);
    var month = parseInt(doc.fields.month, 10);
    var clinic = doc.contact && doc.contact.parent;
    var healthCenter = clinic && clinic.parent;
    var district = healthCenter && healthCenter.parent;
    emit(
      [ doc.form, year, month ],
      {
        isValid: (doc.errors && doc.errors.length === 0),
        clinicId: clinic && clinic._id,
        healthCenterId: healthCenter && healthCenter._id,
        districtId: district && district._id,
        month: month
      }
    );
  }
}
