var targets = [
    // BIRTHS THIS MONTH
    {
      id: 'imm-children-with-bcg-reported',
      type: 'percent',
      icon: 'child',
      goal: 100,
      translation_key: 'targets.bcg_reported.title',
      subtitle_translation_key: 'targets.all_time.subtitle',
      context: "(user.parent.use_cases && user.parent.use_cases.split(' ').indexOf('imm') !== -1) || (user.parent.parent.use_cases && user.parent.parent.use_cases.split(' ').indexOf('imm') !== -1)",
      appliesToType: 'person',
      appliesIf: isHealthyDelivery,
      passesIf: isHealthyDelivery,
    }
];