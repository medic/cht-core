const cards = [];
const context = {};
const patientIDs = {};
const { CONTACT_TYPES } = require('@medic/constants');

const fields = [
  {
    appliesToType: [CONTACT_TYPES.PERSON],
    label: 'patient_id',
    value: patientIDs.contact.patient_id,
    width: 3,
  }
];

module.exports = {
  cards,
  fields,
  context
};
