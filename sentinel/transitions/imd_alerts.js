module.exports = {
  form: 'IMD',
  required_fields: 'related_entities.clinic !forwarded_alerts',
  onMatch: function(change) {
    var doc = change.doc,
        clinic = doc.related_entities.clinic,
        clinicName = clinic ? clinic.name : '',
        parent = clinic.parent,
        phone,
        phones = [],
        self = this;

    // ignore transition if doc has errors/is not valid
    if (doc.errors && doc.errors.length !== 0)
        return self.complete(null, false);

    while (parent) {
      phone = parent.contact && parent.contact.phone;
      if (phone) {
        phones.push(phone);
      }
      parent = parent.parent;
    }

    self.addMessage(doc, phones, self.i18n(
        "CDC Outbreak Report: Unit ID: {{refid}}, Ward: {{ward}}, "
        + "Location: {{location}}, AFP: {{afp}}, MSL: {{msl}}, "
        + "Patient Contact: {{patientPhone}}", {
      refid: doc.refid,
      ward: doc.ward,
      location: doc.location,
      patientPhone: doc.phone_number,
      afp: doc.afp_present,
      msl: doc.msl_present
    }));

    doc.forwarded_alerts = true;

    this.complete(null, doc);
  }
}
