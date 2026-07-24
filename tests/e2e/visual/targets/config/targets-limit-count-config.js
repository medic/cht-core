module.exports = [
  {
    id: 'active-pregnancies',
    type: 'count',
    icon: 'icon-pregnancy',
    goal: 3,
    limit_count_to_goal: true,
    translation_key: 'targets.anc.active_pregnancies.title',
    subtitle_translation_key: 'targets.all_time.subtitle',
    appliesTo: 'reports',
    appliesToType: ['pregnancy'],
    appliesIf: function(contact, report) {
      const now = new Date();
      if (!report || !report.fields) {
        return false;
      }
      const lmp = report.fields.lmp_date_8601;
      if (!lmp) {
        return false;
      }
      const lmpDate = new Date(lmp);
      const eddDate = new Date(lmpDate);
      eddDate.setDate(eddDate.getDate() + 280);
      return lmpDate <= now && eddDate >= now;
    },
    date: 'now',
    idType: 'contact'
  }
];
