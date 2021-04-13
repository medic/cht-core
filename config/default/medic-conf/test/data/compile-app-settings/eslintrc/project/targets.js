const id = 'active-pregnancies'

module.exports = [
  {
    id: id,
    appliesTo: 'reports',
    type: 'count',
    icon: 'pregnancy-1',
    goal: -1,
    translation_key: 'targets.active_pregnancies.title',
    subtitle_translation_key: 'targets.all_time.subtitle',

    appliesIf: function(c, r) { return r.form === 'D'; },
    date: 'now',
  }
];
