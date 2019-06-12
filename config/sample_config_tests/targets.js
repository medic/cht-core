module.exports = [
  {
    id: 'active-pregnancies',
    type: 'count',
    icon: 'pregnancy-1',
    goal: 10,
    translation_key: 'targets.active_pregnancies.title',
    subtitle_translation_key: 'targets.all_time.subtitle',
    passesIf: function () {
      return true;
    },
    appliesTo: 'reports',
    appliesIf: function (e, r) {
      return extras.validateReport(r);
    },
    date: 'now'
  },
  // BIRTHS THIS MONTH
  {
    id: 'imm-children-with-bcg-reported',
    type: 'percent',
    icon: 'child',
    goal: 100,
    translation_key: 'targets.bcg_reported.title',
    subtitle_translation_key: 'targets.all_time.subtitle',
    context: '(user.parent.use_cases && user.parent.use_cases.split(" ").indexOf("imm") !== -1) || (user.parent.parent.use_cases && user.parent.parent.use_cases.split(" ").indexOf("imm") !== -1)',
    appliesTo: 'contacts',
    appliesToType: 'person',
    appliesIf: extras.isHealthyDelivery,
    passesIf: extras.isHealthyDelivery,
  }
];
