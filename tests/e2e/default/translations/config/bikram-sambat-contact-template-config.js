// eslint-disable-next-line no-undef
const date = contact.reported_date;
// eslint-disable-next-line no-undef
const phone = contact.phone;
// eslint-disable-next-line no-undef
const field = contact.field;
// eslint-disable-next-line no-undef
const another = contact.another;
const { CONTACT_TYPES } = require('@medic/constants');

const fields = [
  { appliesToType: CONTACT_TYPES.PERSON, label: 'dateOfDeath', value: date, width: 4, filter: 'dateOfDeath' },
  { appliesToType: CONTACT_TYPES.PERSON, label: 'age', value: date, width: 4, filter: 'age' },
  { appliesToType: CONTACT_TYPES.PERSON, label: 'dayMonth', value: date, width: 4, filter: 'dayMonth' },
  { appliesToType: CONTACT_TYPES.PERSON, label: 'relativeDate', value: date, width: 4, filter: 'relativeDate' },
  { appliesToType: CONTACT_TYPES.PERSON, label: 'relativeDay', value: date, width: 4, filter: 'relativeDay' },
  { appliesToType: CONTACT_TYPES.PERSON, label: 'simpleDate', value: date, width: 4, filter: 'simpleDate' },
  { appliesToType: CONTACT_TYPES.PERSON, label: 'simpleDateTime', value: date, width: 4, filter: 'simpleDateTime' },
  { appliesToType: CONTACT_TYPES.PERSON, label: 'fullDate', value: date, width: 4, filter: 'fullDate' },

  { appliesToType: CONTACT_TYPES.PERSON, label: 'phone', value: phone, width: 4, filter: 'localizeNumber' },
  { appliesToType: CONTACT_TYPES.PERSON, label: 'field', value: field, width: 4, filter: 'localizeNumber' },
  { appliesToType: CONTACT_TYPES.PERSON, label: 'another', value: another, width: 4 },
];

module.exports = {
  context: { },
  cards: [],
  fields,
};
