const {
  MAX_DAYS_IN_PREGNANCY,
  DAYS_IN_PNC,
  MS_IN_DAY,
  isFormFromArraySubmittedInWindow,
  isCoveredByUseCase,
  getNewestPregnancyTimestamp,
  getNewestDeliveryTimestamp,
  isHighRiskPregnancy,
  deliveryForms,
  antenatalForms,
  postnatalForms,
  isHomeBirth,
  immunizationMonths,
  immunizationForms,
} = require('./nools-extras');

module.exports = [
  {
    name: 'pregnancy_danger_sign',
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
        start: 0,
        end: 6,
        dueDate: function(event, c) {
          return new Date(
              Utils.getMostRecentTimestamp(c.reports, 'F')
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
    name: 'pregnancy_missing_birth',
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
        dueDate: function(event, c, r) {
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
    name: 'pregnancy_missing_visit',
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
    name: 'postnatal_home_birth',
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
    name: 'postnatal_danger_sign',
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
        dueDate: function(event, c) {
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
    name: 'postnatal_missing_visit',
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
    name: 'immunization_missing_visit',
    icon: 'immunization',
    title: 'task.immunization_missing_visit.title',
    appliesTo: 'scheduled_tasks',
    appliesToType: ['C', 'CW', 'child_health_registration'],
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

  // followup tasks as per nutrition program schedule (OTP, SFP, or SC)
  {
    name: 'nutrition_followup',
    icon: 'child',
    title: 'task.nutrition_followup.title',
    appliesTo: 'scheduled_tasks',
    appliesToType: ['nutrition_screening'],
    appliesIf: function(c, r) {
      return (
        isCoveredByUseCase(c.contact, 'gmp') &&
        r.fields.treatment.program &&
        (r.fields.treatment.program === 'OTP' || r.fields.treatment.program === 'SFP' || r.fields.treatment.program === 'SC')
      );

    },
    actions: [{ form: 'nutrition_followup' }],
    events: [
      {
        id: 'nutrition-followup-missing-visit',
        days: 0,
        start: 0,
        end: 3,
      }
    ],
    resolvedIf: function(c, r, e, dueDate, i) {
      return (
        r.scheduled_tasks[i].state === 'cleared' ||
        isFormFromArraySubmittedInWindow(
          c.reports,
          ['nutrition_followup', 'CF'],
          Utils.addDate(dueDate, 0).getTime(),
          Utils.addDate(dueDate, e.end + 1).getTime()
        )
      );
    }
  },

  // create nutrition screening task if degree of severity is moderate or severe
  {
    name: 'nutrition_screening',
    icon: 'child',
    title: 'task.nutrition_screening.title',
    appliesTo: 'reports',
    appliesToType: ['G'],
    appliesIf: function(c, r){
      var severity = r.fields.severity.toString();
      return severity === '3' || severity === '2';
    },
    actions: [{form: 'nutrition_screening'}],
    events: [
      {
      id: 'nutrition_screening',
      days: 2,
      start: 2,
      end: 0
    }],
    resolvedIf: function(c){
      return c.reports.some(function(r){
        return r.form === 'nutrition_screening';
      });
    }
  },

  // create nutrition screening task if degree of severity is severe (3)
  {
    name: 'nutrition_screening_missing.severe',
    icon: 'child',
    title: 'task.nutrition_screening_missing.title',
    appliesTo: 'reports',
    appliesToType: ['G'],
    appliesIf: function(c, r){
      return r.fields.severity.toString() === '3';
    },
    actions: [{form: 'nutrition_screening'}],
    events: [
      {
      id: 'nutrition_screening',
      days: 7,
      start: 0,
      end: 7
    }],
    resolvedIf: function(c){
      return c.reports.some(function(r){
        return r.form === 'nutrition_screening';
      });
    }
  },

  // create nutrition screening task if degree of severity is moderate
  {
    name: 'nutrition_screening_missing.moderate',
    icon: 'child',
    title: 'task.nutrition_screening_missing.title',
    appliesTo: 'reports',
    appliesToType: ['G'],
    appliesIf: function(c, r){
      return r.fields.severity.toString() === '2';
    },
    actions: [{form: 'nutrition_screening'}],
    events: [{
      id: 'nutrition_screening',
      days: 21,
      start: 0,
      end: 7
    }],
    resolvedIf: function(c){
      return c.reports.some(function(r){
        return r.form === 'nutrition_screening';
      });
    }
  },

  // Create death confirmation task
  {
    name: 'death_confirmation',
    icon: 'icon-death-general',
    title: 'task.death_confirmation.title',
    appliesTo: 'reports',
    appliesToType: ['DR', 'nutrition_exit'],
    appliesIf: function(c, r){
      return (
        r.form === 'DR' ||
        (r.form === 'nutrition_exit' && r.fields.exit.outcome === 'dead')
      );
    },
    actions: [{form: 'death_confirmation'}],
    events: [{
      id: 'death-confirmation',
      days: 2,
      start: 2,
      end: 7
    }],
    resolvedIf: function(c){
      return c.reports.some(function(r){
        return r.form === 'death_confirmation' && r.fields.death_report.death === 'yes';
      });
    }
  },

  // Exit child from nutrition program
  {
    name: 'nutrition_exit',
    icon: 'child',
    title: 'task.nutrition_exit.title',
    appliesTo: 'reports',
    appliesToType: ['nutrition_followup'],
    appliesIf: function(c, r){
      return r.fields.measurements.exit === 'yes';
    },
    actions: [{form: 'nutrition_exit'}],
    events: [{
      id: 'nutrition-exit',
      days: 2,
      start: 2,
      end: 7
    }],
    resolvedIf: function(c){
      return c.reports.some(function(r){
        return r.form === 'nutrition_exit';
      });
    }
  },
];
