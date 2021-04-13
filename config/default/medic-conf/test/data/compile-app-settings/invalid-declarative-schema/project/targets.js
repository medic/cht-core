module.exports = [
  {
    id: 'active-pregnancies',
    appliesTo: 'reports',
    type: 'count',
    icon: 'pregnancy-1',
    goal: -1,
    translation_key: 'targets.active_pregnancies.title',
    subtitle_translation_key: 'targets.all_time.subtitle',

    appliesIf: () => true,
    date: 'now',

    not_in_shema: true,
  },
];
