// eslint-disable-next-line no-undef
const date = contact.reported_date;

const fields = [
  { appliesToType: 'person', label: 'dateOfDeath', value: date, width: 4, filter: 'dateOfDeath' },
  { appliesToType: 'person', label: 'age', value: date, width: 4, filter: 'age' },
  { appliesToType: 'person', label: 'dayMonth', value: date, width: 4, filter: 'dayMonth' },
  { appliesToType: 'person', label: 'relativeDate', value: date, width: 4, filter: 'relativeDate' },
  { appliesToType: 'person', label: 'relativeDay', value: date, width: 4, filter: 'relativeDay' },
  { appliesToType: 'person', label: 'simpleDate', value: date, width: 4, filter: 'simpleDate' },
  { appliesToType: 'person', label: 'simpleDateTime', value: date, width: 4, filter: 'simpleDateTime' },
  { appliesToType: 'person', label: 'fullDate', value: date, width: 4, filter: 'fullDate' },
];

module.exports = {
  context: { },
  cards: [],
  fields,
};
