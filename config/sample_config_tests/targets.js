var targets = [
    {
        id: 'active-pregnancies',
        type: 'count',
        icon: 'pregnancy-1',
        goal: 10,
        translation_key: 'targets.active_pregnancies.title',
        subtitle_translation_key: 'targets.all_time.subtitle',
        passesIf: function(){
          return true;
        },
        appliesTo: 'reports',
        appliesIf: function(e,r) {
          return validateReport(r);
        },
        date: 'now',
      }
];