module.exports = {
  form: 'IMD',
  required_fields: 'related_entities.clinic !forwarded_alerts',
  onMatch: function(change) {
    var doc = change.doc,
        clinic = doc.related_entities.clinic,
        clinicName = clinic.name,
        parent = clinic.parent,
        phone,
        phones = [],
        self = this;

    while (parent) {
      phone = parent.contact && parent.contact.phone;
      if (phone) {
        phones.push(phone);
      }
      parent = parent.parent;
    }

    self.addMessage(doc, phones, self.i18n("CDC outbreak report at VDC {{vdc}} Ward {{ward}} Location {{location}} from {{clinicName}}: AFP {{afp}}, MSL {{msl}}. Patient contact: {{patientPhone}}", {
      vdc: doc.vdc,
      ward: doc.ward,
      location: doc.location,
      patientPhone: doc.phone_number,
      clinicName: clinicName,
      afp: doc.afp_present,
      msl: doc.msl_present
    }));

    doc.forwarded_alerts = true;

    this.complete(null, doc);
  }
}
