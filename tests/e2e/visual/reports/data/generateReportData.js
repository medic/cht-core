const personFactory = require('@factories/cht/contacts/person');
const pregnancyFactory = require('@factories/cht/reports/pregnancy');

const contact = personFactory.build();
const verifiedReport = pregnancyFactory.build({
  fields: {
    patient_name: 'Lena',
  },
  verified: true,
});
const errorReport = pregnancyFactory.build({
  fields: {
    patient_name: 'Lena',
  },
  errors: [ { code: 'sys.missing_fields', fields: [ 'patient_id' ] } ]
});

// Create  pregnancy reports
const reports = pregnancyFactory.buildList(4);
reports.push(...[verifiedReport, errorReport]);

module.exports = {
  reports,
  contact
};
