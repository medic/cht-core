[
  {
    icon: 'mother-child',
    title: 'task.pregnancy_danger_sign.title',
    appliesTo: 'reports',
    appliesToType: ['P', 'pregnancy'],
    appliesIf: function(c, r) {
      // ANC TASK if a F flag during pregnancy
      return Utils.isFormSubmittedInWindow(
        c.reports,
        'F',
        r.reported_date,
        Utils.addDate(
          new Date(r.reported_date),
          MAX_DAYS_IN_PREGNANCY
        ).getTime()
      );
    },
    actions: [{ form: 'pregnancy_visit' }],
    events: [
      {
        id: 'pregnancy-danger-sign',
        days: 0,
        start: 0,
        end: 6,
        dueDate: function(r, event) {
          return new Date(
            Utils.addDate(
              new Date(
                Utils.getMostRecentTimestamp(c.reports, 'F')
              ),
              event.days
            )
          );
        },
      },
    ],
    priority: {
      level: 'high',
      label: 'task.warning.danger_sign',
    },
    resolvedIf: function(c, r, event, dueDate) {
      return (
        r.reported_date < getNewestDeliveryTimestamp(c) ||
        r.reported_date < getNewestPregnancyTimestamp(c) ||
        isFormFromArraySubmittedInWindow(
          c.reports,
          'pregnancy_visit',
          Utils.addDate(dueDate, -event.start).getTime(),
          Utils.addDate(dueDate, event.end + 1).getTime()
        )
      );
    },
  },

  // Attach the missing birth schedule to the last scheduled SMS
  {
    icon: 'mother-child',
    title: 'task.pregnancy_missing_birth.title',
    appliesTo: 'reports',
    appliesToType: ['P', 'pregnancy'],
    appliesIf: function(c, r) {
      return r.scheduled_tasks;
    },
    actions: [{ form: 'delivery' }],
    events: [
      {
        id: 'pregnancy-missing-birth',
        start: 1,
        end: 13,
        dueDate: function(r) {
          return Utils.addDate(
            new Date(r.scheduled_tasks[r.scheduled_tasks.length - 1].due),
            7
          );
        },
      },
    ],
    priority: function(c, r) {
      if (isHighRiskPregnancy(c, r)) {
        return {
          level: 'high',
          label: 'task.warning.high_risk',
        };
      }
    },
    resolvedIf: function(c, r) {
      // Missing Birth Report
      // Resolved if the scheduled SMS that generated the task is cleared
      //          or if a birth report was submitted
      return (
        r.scheduled_tasks[r.scheduled_tasks.length - 1].state === 'cleared' ||
        isFormFromArraySubmittedInWindow(
          c.reports,
          deliveryForms,
          r.reported_date,
          r.reported_date + (MAX_DAYS_IN_PREGNANCY + DAYS_IN_PNC) * MS_IN_DAY
        )
      );
    },
  },

  // Assign a missing visit schedule to last SMS of each group
  //
  // Associate tasks to the last message of each group, except the last one which needs a Missing Birth Report task.
  // The group needing Birth Report task is now in a separate schedule, which could have the same group number... so check the type as well.
  // Be mindful of overflow when peaking ahead!
  {
    icon: 'pregnancy-1',
    title: 'task.pregnancy_missing_visit.title',
    appliesTo: 'scheduled_tasks',
    appliesToType: ['P', 'pregnancy'],
    appliesIf: function(c, r, i) {
      return (
        i + 1 < r.scheduled_tasks.length &&
        (r.scheduled_tasks[i].group !== r.scheduled_tasks[i + 1].group ||
          r.scheduled_tasks[i].type !== r.scheduled_tasks[i + 1].type)
      );
    },
    actions: [{ form: 'pregnancy_visit' }],
    events: [
      {
        id: 'pregnancy-missing-visit',
        days: 7,
        start: 0,
        end: 6,
      },
    ],
    priority: function(c, r) {
      if (isHighRiskPregnancy(c, r)) {
        return {
          level: 'high',
          label: 'task.warning.high_risk',
        };
      }
    },
    resolvedIf: function(c, r, event, dueDate) {
      return (
        r.reported_date < getNewestPregnancyTimestamp(c) ||
        r.reported_date < getNewestDeliveryTimestamp(c) ||
        isFormFromArraySubmittedInWindow(
          c.reports,
          antenatalForms,
          Utils.addDate(dueDate, -event.start).getTime(),
          Utils.addDate(dueDate, event.end + 1).getTime()
        )
      );
    },
  },

  // PNC TASK 1: If a home delivery, needs clinic tasks
  {
    icon: 'mother-child',
    title: 'task.postnatal_home_birth.title',
    appliesTo: 'reports',
    appliesToType: ['D', 'delivery'],
    appliesIf: function(c, r) {
      return (
        isCoveredByUseCase(c.contact, 'pnc') &&
        r.fields &&
        r.fields.delivery_code &&
        r.fields.delivery_code.toUpperCase() !== 'F'
      );
    },
    actions: [{ form: 'postnatal_visit' }],
    events: [
      {
        id: 'postnatal-home-birth',
        days: 0,
        start: 0,
        end: 4,
      },
    ],
    priority: {
      level: 'high',
      label: 'task.warning.home_birth',
    },
    resolvedIf: function(c, r, event, dueDate) {
      // Resolved if there a visit report received in time window or a newer pregnancy
      return (
        r.reported_date < getNewestDeliveryTimestamp(c) ||
        r.reported_date < getNewestPregnancyTimestamp(c) ||
        isFormFromArraySubmittedInWindow(
          c.reports,
          postnatalForms,
          Utils.addDate(dueDate, -event.start).getTime(),
          Utils.addDate(dueDate, event.end + 1).getTime()
        )
      );
    },
  },

  // PNC TASK 2: if a F flag sent in 42 days since delivery needs clinic task
  {
    icon: 'mother-child',
    title: 'task.postnatal_danger_sign.title',
    appliesTo: 'reports',
    appliesToType: ['D', 'delivery'],
    appliesIf: function(c, r) {
      return (
        isCoveredByUseCase(c.contact, 'pnc') &&
        Utils.isFormSubmittedInWindow(
          c.reports,
          'F',
          r.reported_date,
          Utils.addDate(new Date(r.reported_date), DAYS_IN_PNC).getTime()
        )
      );
    },
    actions: [{ form: 'postnatal_visit' }],
    events: [
      {
        id: 'postnatal-danger-sign',
        start: 0,
        end: 6,
        dueDate: function() {
          return new Date(Utils.getMostRecentTimestamp(c.reports, 'F'));
        },
      },
    ],
    priority: {
      level: 'high',
      label: 'task.warning.danger_sign',
    },
    resolvedIf: function(c, r, event, dueDate) {
      // Only resolved with PNC report received from nurse in time window or a newer pregnancy
      return (
        r.reported_date < getNewestDeliveryTimestamp(c) ||
        r.reported_date < getNewestPregnancyTimestamp(c) ||
        isFormFromArraySubmittedInWindow(
          c.reports,
          'postnatal_visit',
          Utils.addDate(dueDate, -event.start).getTime(),
          Utils.addDate(dueDate, event.end + 1).getTime()
        )
      );
    },
  },

  // PNC TASK 3: Assign a missing visit schedule to last SMS of each group
  // Associate tasks to the last message of each group. Be mindful of overflow when peaking ahead!
  {
    icon: 'mother-child',
    title: 'task.postnatal_missing_visit.title',
    appliesTo: 'scheduled_tasks',
    appliesToType: ['D', 'delivery'],
    appliesIf: function(c, r, i) {
      return (
        isCoveredByUseCase(c.contact, 'pnc') &&
        (i + 1 >= r.scheduled_tasks.length ||
         r.scheduled_tasks[i].group !== r.scheduled_tasks[i + 1].group)
      );
    },
    priority: function(c, r) {
      if (isHomeBirth(r)) {
        return {
          level: 'high',
          label: 'task.warning.home_birth',
        };
      }
    },
    actions: [{ form: 'postnatal_visit' }],
    events: [
      {
        id: 'postnatal-missing-visit',
        days: 1,
        start: 0,
        end: 3,
      },
    ],
    resolvedIf: function(c, r, event, dueDate, i) {
      // Resolved if the scheduled SMS that generated the task is cleared,
      //          if there a visit report received in time window or a newer pregnancy
      return (
        r.scheduled_tasks[i].state === 'cleared' ||
        r.reported_date < getNewestDeliveryTimestamp(c) ||
        r.reported_date < getNewestPregnancyTimestamp(c) ||
        isFormFromArraySubmittedInWindow(
          c.reports,
          postnatalForms,
          Utils.addDate(dueDate, -event.start).getTime(),
          Utils.addDate(dueDate, event.end + 1).getTime()
        )
      );
    },
  },

  // IMM Task based on Child Health monthly SMS
  // Assign task to specific age in months corresponding to the group number
  {
    icon: 'immunization',
    title: 'task.immunization_missing_visit.title',
    appliesTo: 'scheduled_tasks',
    appliesToType: ['CW', 'child_health_registration'],
    appliesIf: function(c, r, i) {
      return (
        isCoveredByUseCase(c.contact, 'imm') &&
        immunizationMonths.indexOf(r.scheduled_tasks[i].group) !== -1
      );
    },
    actions: [{ form: 'immunization_visit' }],
    events: [
      {
        id: 'immunization-missing-visit',
        days: 21,
        start: 7,
        end: 13,
      },
    ],
    resolvedIf: function(c, r, event, dueDate, i) {
      // Resolved if the scheduled SMS that generated the task is cleared,
      //          if an immunization report has been received in time window starting at SMS send date
      return (
        r.scheduled_tasks[i].state === 'cleared' ||
        isFormFromArraySubmittedInWindow(
          c.reports,
          immunizationForms,
          Utils.addDate(dueDate, -event.days).getTime(),
          Utils.addDate(dueDate, event.end + 1).getTime()
        )
      );
    },
  },
]
