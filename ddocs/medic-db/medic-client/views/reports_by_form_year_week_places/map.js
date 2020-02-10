// data record must adhere to property name of `week` or `week_number`
function(doc) {
  if (doc.type === 'data_record' &&
      doc.form &&
      doc.fields &&
      doc.fields.year &&
      (doc.fields.week || doc.fields.week_number)) {
    var year = parseInt(doc.fields.year, 10);
    var week = parseInt(doc.fields.week || doc.fields.week_number, 10);
    var clinic = doc.contact && doc.contact.parent;
    var healthCenter = clinic && clinic.parent;
    var district = healthCenter && healthCenter.parent;
    emit(
      [ doc.form, year, week ],
      {
        isValid: (doc.errors && doc.errors.length === 0),
        clinicId: clinic && clinic._id,
        healthCenterId: healthCenter && healthCenter._id,
        districtId: district && district._id,
        weekNumber: week
      }
    );
  }
}
