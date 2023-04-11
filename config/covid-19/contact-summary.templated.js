// contact, reports, lineage are globally available for contact-summary
const thisContact = contact;
const thisLineage = lineage;

const fields = [
  { appliesToType: 'person', label: 'patient_id', value: thisContact.patient_id, width: 4 },
  { appliesToType: 'person', label: 'contact.age', value: thisContact.date_of_birth, filter: 'age', width: 4 },
  { appliesToType: 'person', label: 'contact.sex', value: 'contact.sex.' + thisContact.sex, translate: true, width: 4 },
  { appliesToType: 'person', label: 'person.field.phone', value: thisContact.phone, width: 4 },
  { appliesToType: 'person', label: 'person.field.alternate_phone', value: thisContact.phone_alternate, width: 4 },
  { appliesToType: '!person', label: 'contact', value: thisContact.contact && thisContact.contact.name, width: 4 },
  { appliesToType: '!person', label: 'contact.phone', value: thisContact.contact && thisContact.contact.phone, width: 4 },
  { label: 'External ID', value: thisContact.external_id, width: 4 },
  { label: 'contact.parent', appliesIf: () => thisContact.parent && thisLineage[0], value: thisLineage, filter: 'lineage' },
  { label: 'Address', value: thisContact.address },
  { label: 'contact.notes', value: thisContact.notes },
];

module.exports = {
  context: {},
  cards: [],
  fields: fields
};
