module.exports = [
  {
    name: 'task-error',
    icon: 'icon-person',
    title: 'task-error.title',
    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: (contact) => contact.foo.name,
    actions: [{ type: 'report', form: 'person_create_7' }],
    events: [
      {
        start: 0,
        days: 3,
        end: 4
      }
    ]
  }
];
