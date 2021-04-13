module.exports = {
  fields: [
    {
      appliesToType: 'person',
      label: 'testing',
      value: 5,
    },
    {
      appliesToType: 'person',
      label: 'contact.age',
      value: contact.date_of_birth,
      filter: 'age',
      width: 3,
    },
    {
      appliesToType: '!person',
      label: 'not.a.person',
      value: contact.type,
      width: 3,
    },
  ],

  cards: [
    {
      appliesToType: 'person',
      appliesIf: () => true,
      fields: [],
      label: 'card1'
    },
    {
      appliesToType: 'clinic',
      appliesIf: () => true,
      fields: [],
      label: 'card2'
    }
  ],


  context: {
    foo: 'bar',
    muted: contact.type === 'clinic' && lineage[0] && !!lineage[0].muted,
  },
};
