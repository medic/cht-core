const reportFactory = require('@factories/cht/reports/generic-report');
const personFactory = require('@factories/cht/contacts/person');

const contact = personFactory.build();
const REPORTED_DATE = Date.now() - (13 * 60 * 60 * 1000);

const reports = [
  reportFactory
    .report()
    .build({
      fields: {
        patient_name: 'Jadena'
      },
      form: 'Health Facility ANC reminder',
      content_type: 'xml',
      contact: {
        _id: contact._id,
      },
      reported_date: REPORTED_DATE,
      from: 'Unknown sender',
      verified: true,
    }),
  reportFactory
    .report()
    .build({
      fields: {
        patient_name: 'Zoe'
      },
      form: 'Health Facility ANC reminder',
      content_type: 'xml',
      contact: {
        _id: contact._id,
      },
      reported_date: REPORTED_DATE,
      from: 'Unknown sender',
    }),
  reportFactory
    .report()
    .build({
      fields: {
        patient_name: 'Shaila'
      },
      form: 'Postnatal danger sign follow-up',
      content_type: 'xml',
      contact: {

        _id: contact._id,
      },
      reported_date: REPORTED_DATE,
      from: 'Unknown sender',
    }),
  reportFactory
    .report()
    .build({
      fields: {
        patient_name: 'Kelly'
      },
      form: 'Postnatal danger sign follow-up',
      content_type: 'xml',
      contact: {

        _id: contact._id,
      },
      reported_date: REPORTED_DATE,
      from: 'Unknown sender',
      errors: [ { code: 'sys.missing_fields', fields: [ 'patient_id' ] } ]
    }),
  reportFactory
    .report()
    .build({
      fields: {
        patient_name: 'Lena'
      },
      form: 'Health Facility ANC reminder',
      content_type: 'xml',
      contact: {

        _id: contact._id,
      },
      reported_date: REPORTED_DATE,
      from: 'Unknown sender',
      verified: true,
    }),
  reportFactory
    .report()
    .build({
      fields: {
        patient_name: 'Lena'
      },
      form: 'Postnatal danger sign follow-up',
      content_type: 'xml',
      contact: {
        _id: contact._id,
      },
      reported_date: REPORTED_DATE,
      from: 'Unknown sender',
    }),
];

module.exports = {
  reports,
  contact,
};
