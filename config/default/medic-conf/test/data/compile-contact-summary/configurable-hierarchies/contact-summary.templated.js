module.exports = {
  fields: [
    {
      appliesToType: 'patient',
      label: 'testing',
      value: 5,
    },
    {
      appliesToType: 'patient',
      label: 'contact.age',
      value: contact.date_of_birth,
      filter: 'age',
      width: 3,
    },
    {
      appliesToType: 'chw',
      label: 'contact.phone',
      value: contact.phone,
      filter: 'phone',
    },
    {
      appliesToType: '!chw',
      label: 'everyone.except.chw',
      value: 100,
      width: 3,
    },
    {
      appliesToType: 'clinic',
      label: 'contact.place_id',
      value: contact.place_id,
      width: 2,
    },
  ],

  cards: [
    {
      appliesToType: 'patient',
      appliesIf: () => true,
      fields: [],
      label: 'for.patient',
    },
    {
      appliesToType: 'chw',
      appliesIf: () => true,
      fields: [],
      label: 'for.chw',
    },
    {
      appliesToType: 'clinic',
      appliesIf: () => true,
      fields: [],
      label: 'for.clinic',
    }
  ],

  context: {
    foo: 'bar',
    muted: contact.type === 'clinic' && lineage[0] && !!lineage[0].muted,
  },
};
