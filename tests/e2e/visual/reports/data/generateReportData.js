const personFactory = require('@factories/cht/contacts/person');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');

const contact = personFactory.build();

// Create  pregnancy reports
const reports = [
  pregnancyFactory.build({ fields: { patient_name: 'Malena' } }),
  pregnancyFactory.build({ fields: { patient_name: 'Jadena' } }),
  pregnancyFactory.build({ fields: { patient_name: 'Zoe' }, verified: true }),
  pregnancyFactory.build({
    fields: { patient_name: 'Shaila' },
    verified: true,
  }),
  pregnancyFactory.build({ fields: { patient_name: 'Kelly' } }),
  pregnancyFactory.build({
    fields: { patient_name: 'Lena' },
    errors: [{ code: 'sys.missing_fields', fields: ['patient_id'] }],
  }),
];

module.exports = {
  reports,
  contact
};
