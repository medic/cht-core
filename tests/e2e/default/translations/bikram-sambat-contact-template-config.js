// eslint-disable-next-line no-undef
const date = contact.reported_date;
// eslint-disable-next-line no-undef
const phone = contact.phone;
// eslint-disable-next-line no-undef
const field = contact.field;
// eslint-disable-next-line no-undef
const another = contact.another;

const fields = [
  { appliesToType: 'person', label: 'dateOfDeath', value: date, width: 4, filter: 'dateOfDeath' },
  { appliesToType: 'person', label: 'age', value: date, width: 4, filter: 'age' },
  { appliesToType: 'person', label: 'dayMonth', value: date, width: 4, filter: 'dayMonth' },
  { appliesToType: 'person', label: 'relativeDate', value: date, width: 4, filter: 'relativeDate' },
  { appliesToType: 'person', label: 'relativeDay', value: date, width: 4, filter: 'relativeDay' },
  { appliesToType: 'person', label: 'simpleDate', value: date, width: 4, filter: 'simpleDate' },
  { appliesToType: 'person', label: 'simpleDateTime', value: date, width: 4, filter: 'simpleDateTime' },
  { appliesToType: 'person', label: 'fullDate', value: date, width: 4, filter: 'fullDate' },

  { appliesToType: 'person', label: 'phone', value: phone, width: 4, filter: 'localizeNumber' },
  { appliesToType: 'person', label: 'field', value: field, width: 4, filter: 'localizeNumber' },
  { appliesToType: 'person', label: 'another', value: another, width: 4 },
];

module.exports = {
  context: { },
  cards: [],
  fields,
};
