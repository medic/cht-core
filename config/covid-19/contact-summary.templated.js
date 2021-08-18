// contact, reports, lineage are globally available for contact-summary
const thisContact = contact;
const thisLineage = lineage;

const fields = [
  { appliesToType: 'person', label: 'patient_id', value: thisContact.patient_id, width: 4 },
  { appliesToType: 'person', label: 'contact.age', value: thisContact.date_of_birth, width: 4, filter: 'age' },
  { appliesToType: 'person', label: 'contact.sex', value: 'contact.sex.' + thisContact.sex, translate: true, width: 4 },
  { appliesToType: 'person', label: 'person.field.phone', value: thisContact.phone, width: 4 },
  { appliesToType: 'person', label: 'person.field.alternate_phone', value: thisContact.phone_alternate, width: 4 },
  { appliesToType: 'person', label: 'External ID', value: thisContact.external_id, width: 4 },
  { appliesToType: 'person', label: 'contact.parent', value: thisLineage, filter: 'lineage' },
  { appliesToType: '!person', label: 'contact', value: thisContact.contact && thisContact.contact.name, width: 4 },
  {
    appliesToType: '!person',
    label: 'contact.phone',
    value: thisContact.contact && thisContact.contact.phone,
    width: 4
  },
  { appliesToType: '!person', label: 'External ID', value: thisContact.external_id, width: 4 },
  {
    appliesToType: '!person',
    appliesIf: () => thisContact.parent && thisLineage[0],
    label: 'contact.parent',
    value: thisLineage,
    filter: 'lineage'
  },
  { appliesToType: 'person', label: 'Address', value: thisContact.address, width: 12 },
  { appliesToType: '!person', label: 'Address', value: thisContact.address, width: 12 },
  { appliesToType: 'person', label: 'contact.notes', value: thisContact.notes, width: 12 },
  { appliesToType: '!person', label: 'contact.notes', value: thisContact.notes, width: 12 }
];

module.exports = {
  context: {},
  cards: [],
  fields: fields
};
