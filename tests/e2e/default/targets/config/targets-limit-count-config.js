module.exports = [
  {
    id: 'active-pregnancies',
    translation_key: 'targets.anc.active_pregnancies.title',
    type: 'count',
    goal: 1,
    limit_count_to_goal: true,
    appliesTo: 'contacts',
    appliesToType: ['person'],
    date: 'now',
  },
];
