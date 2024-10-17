module.exports = [
  {
    id: 'new-persons',
    type: 'count',
    icon: 'icon-test',
    goal: 0,
    translation_key: 'targets.new_persons.title',
    subtitle_translation_key: 'targets.new_persons.title',
    appliesTo: 'contacts',
    appliesToType: ['person'],
    date: (contact) => contact.contact.reported_date
  },
];
