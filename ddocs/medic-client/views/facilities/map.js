function(doc) {
  if (doc.type === 'clinic' ||
      doc.type === 'health_center' ||
      doc.type === 'district_hospital' ||
      doc.type === 'national_office' ||
      doc.type === 'person') {

    var phone = doc.phone || doc.contact && doc.contact.phone,
        rc_code = doc.contact && doc.contact.rc_code;
    emit(
      [doc.type],
      {
        name: doc.name,
        contact: doc.contact,
        rc_code: rc_code,
        phone: phone
      }
    );
  }
}
