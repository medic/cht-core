const oneDay = 24 * 60 * 60 * 1000;

/**
 * Task configuration for filter e2e tests.
 * Creates tasks with different types and overdue states for testing the sidebar filter.
 */
module.exports = [
  // Task type: home_visit, overdue
  {
    name: 'home_visit_overdue',
    icon: 'icon-healthcare',
    title: 'Home Visit',
    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: function (contact) {
      return contact.contact.patient_id === 'patient_filter_1';
    },
    resolvedIf: function () {
      return false;
    },
    actions: [
      {
        type: 'report',
        form: 'home_visit'
      }
    ],
    events: [
      {
        id: 'home-visit-overdue',
        start: 10,
        end: 10,
        dueDate: function () {
          // Due date in the past = overdue
          return Date.now() - (5 * oneDay);
        }
      }
    ]
  },

  // Task type: home_visit, not overdue
  {
    name: 'home_visit_not_overdue',
    icon: 'icon-healthcare',
    title: 'Home Visit',
    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: function (contact) {
      return contact.contact.patient_id === 'patient_filter_2';
    },
    resolvedIf: function () {
      return false;
    },
    actions: [
      {
        type: 'report',
        form: 'home_visit'
      }
    ],
    events: [
      {
        id: 'home-visit-not-overdue',
        start: 10,
        end: 10,
        dueDate: function () {
          // Due date in the future = not overdue
          return Date.now() + (5 * oneDay);
        }
      }
    ]
  },

  // Task type: assessment, overdue
  {
    name: 'assessment_overdue',
    icon: 'icon-assessment',
    title: 'Assessment',
    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: function (contact) {
      return contact.contact.patient_id === 'patient_filter_3';
    },
    resolvedIf: function () {
      return false;
    },
    actions: [
      {
        type: 'report',
        form: 'assessment'
      }
    ],
    events: [
      {
        id: 'assessment-overdue',
        start: 10,
        end: 10,
        dueDate: function () {
          return Date.now() - (3 * oneDay);
        }
      }
    ]
  },

  // Task type: assessment, not overdue
  {
    name: 'assessment_not_overdue',
    icon: 'icon-assessment',
    title: 'Assessment',
    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: function (contact) {
      return contact.contact.patient_id === 'patient_filter_4';
    },
    resolvedIf: function () {
      return false;
    },
    actions: [
      {
        type: 'report',
        form: 'assessment'
      }
    ],
    events: [
      {
        id: 'assessment-not-overdue',
        start: 10,
        end: 10,
        dueDate: function () {
          return Date.now() + (7 * oneDay);
        }
      }
    ]
  },

  // Task type: follow_up, overdue (for place filter testing with different parent)
  {
    name: 'follow_up_overdue',
    icon: 'icon-followup',
    title: 'Follow Up',
    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: function (contact) {
      return contact.contact.patient_id === 'patient_filter_5';
    },
    resolvedIf: function () {
      return false;
    },
    actions: [
      {
        type: 'report',
        form: 'follow_up'
      }
    ],
    events: [
      {
        id: 'follow-up-overdue',
        start: 10,
        end: 10,
        dueDate: function () {
          return Date.now() - (2 * oneDay);
        }
      }
    ]
  },
];
