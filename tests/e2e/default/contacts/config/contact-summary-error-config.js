const cards = [];
const context = {};
const patientIDs = {};

const fields = [
  {
    appliesToType: ['person'],
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
