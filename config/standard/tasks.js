[
  {
    name: 'pregnancy-danger-sign',
    icon: 'mother-child',
    title: [ { locale:'en', content:'Pregnancy visit needed' } ],
    appliesToForms: [ 'P', 'pregnancy' ],
    appliesIf: function(c, r) {
      // ANC TASK if a F flag during pregnancy
      return Utils.isFormSubmittedInWindow(c.reports, 'F',
          r.reported_date,
          Utils.addDate(new Date(r.reported_date), MAX_DAYS_IN_PREGNANCY).getTime());
    },
    actions: [ { form:'pregnancy_visit' } ],
    events: [ {
      id: 'pregnancy-danger-sign',
      days:0, start:0, end:6,
      dueDate: function(r, event) { return new Date(Utils.addDate(new Date(Utils.getMostRecentTimestamp(c.reports, 'F')), event.days)); },
    } ],
    priority: {
      level: 'high',
      label: [ { locale:'en', content:'Danger Signs' } ],
    },
    resolvedIf: function(c, r, event, dueDate) {
      return r.reported_date < getNewestDeliveryTimestamp(c) ||
             r.reported_date < getNewestPregnancyTimestamp(c) ||
             isFormFromArraySubmittedInWindow(c.reports, 'pregnancy_visit',
                 Utils.addDate(dueDate, -event.start).getTime(),
                 Utils.addDate(dueDate,  event.end+1).getTime());
    },
  },

  // Attach the missing birth schedule to the last scheduled SMS
  {
    name: 'pregnancy-missing-birth',
    icon: 'mother-child',
    title: [ { locale: 'en', content: 'Missing birth report' } ],
    appliesToForms: [ 'P', 'pregnancy' ],
    appliesIf: function(c, r) { return r.scheduled_tasks; },
    actions: [ { form:'delivery' } ],
    events: [ {
      id: 'pregnancy-missing-birth',
      days:7, start:1, end:13,
      dueDate: function(r, event) { return new Date(Utils.addDate(new Date(r.scheduled_tasks[r.scheduled_tasks.length-1].due), event.days)); },
    } ],
    priority: function(c, r) {
      if(isHighRiskPregnancy(c, r)) {
        return {
          level: 'high',
          label: [ { locale:'en', content:'High Risk' } ],
        };
      }
    },
    resolvedIf: function(c, r) {
      // Missing Birth Report
      // Resolved if the scheduled SMS that generated the task is cleared
      //          or if a birth report was submitted
      return r.scheduled_tasks[r.scheduled_tasks.length-1].state === 'cleared' ||
        isFormFromArraySubmittedInWindow(c.reports, deliveryForms,
          r.reported_date,
          r.reported_date + (MAX_DAYS_IN_PREGNANCY+DAYS_IN_PNC)*MS_IN_DAY);
    },
  },

  // Assign a missing visit schedule to last SMS of each group
  //
  // Associate tasks to the last message of each group, except the last one which needs a Missing Birth Report task.
  // The group needing Birth Report task is now in a separate schedule, which could have the same group number... so check the type as well.
  // Be mindful of overflow when peaking ahead!
  {
    name: 'pregnancy-missing-visit',
    icon: 'pregnancy-1',
    title: [ { locale:'en', content:'Missing pregnancy visit' } ],
    appliesToForms: [ 'P', 'pregnancy' ],
    appliesToScheduledTaskIf: function(r, i) {
      return (i+1 < r.scheduled_tasks.length &&
          (r.scheduled_tasks[i].group !== r.scheduled_tasks[i+1].group ||
           r.scheduled_tasks[i].type  !== r.scheduled_tasks[i+1].type));
    },
    actions: [ { form:'pregnancy_visit' } ],
    events: [ {
      id: 'pregnancy-missing-visit',
      days:7, start:0, end:6,
    } ],
    priority: function(c, r) {
      if(isHighRiskPregnancy(c, r)) {
        return {
          level: 'high',
          label: [ { locale:'en', content:'High Risk' } ],
        };
      }
    },
    resolvedIf: function(c, r, event, dueDate) {
      return r.reported_date < getNewestPregnancyTimestamp(c) ||
             r.reported_date < getNewestDeliveryTimestamp(c) ||
             isFormFromArraySubmittedInWindow(c.reports, antenatalForms,
                 Utils.addDate(dueDate, -event.start).getTime(),
                 Utils.addDate(dueDate,  event.end+1).getTime());
    },
  },

  // PNC TASK 1: If a home delivery, needs clinic tasks
  {
    name: 'postnatal-home-birth',
    icon: 'mother-child',
    title: [ { locale:'en', content:'Postnatal visit needed' } ],
    appliesToForms: [ 'D', 'delivery' ],
    appliesIf: function(c, r) {
      return isCoveredByUseCase(c.contact, 'pnc') &&
          r.fields &&
             r.fields.delivery_code &&
             r.fields.delivery_code.toUpperCase() !== 'F';
    },
    actions: [ { form:'postnatal_visit' } ],
    events: [ {
      id: 'postnatal-home-birth',
      days:0, start:0, end:4,
    } ],
    priority: {
      level: 'high',
      label: [ { locale:'en', content:'Home Birth' } ],
    },
    resolvedIf: function(c, r, event, dueDate) {
      // Resolved if there a visit report received in time window or a newer pregnancy
      return r.reported_date < getNewestDeliveryTimestamp(c) ||
             r.reported_date < getNewestPregnancyTimestamp(c) ||
             isFormFromArraySubmittedInWindow(c.reports, postnatalForms,
                 Utils.addDate(dueDate, -event.start).getTime(),
                 Utils.addDate(dueDate,  event.end+1).getTime());
    },
  },

  // PNC TASK 2: if a F flag sent in 42 days since delivery needs clinic task
  {
    name: 'postnatal-danger-sign',
    icon: 'mother-child',
    title: [ { locale: 'en', content: 'Postnatal visit needed' } ],
    appliesToForms: [ 'D', 'delivery' ],
    appliesIf: function(c, r) {
      return isCoveredByUseCase(c.contact, 'pnc') &&
          Utils.isFormSubmittedInWindow(c.reports, 'F',
              r.reported_date,
              Utils.addDate(new Date(r.reported_date), DAYS_IN_PNC).getTime());
    },
    actions: [ { form:'postnatal_visit' } ],
    events: [ {
      id: 'postnatal-danger-sign',
      days:0, start:0, end:6,
      dueDate: function(r, event) { return new Date(Utils.addDate(new Date(Utils.getMostRecentTimestamp(c.reports, 'F')), event.days)); },
    } ],
    priority: {
      level: 'high',
      label: [ { locale: 'en', content: 'Danger Signs' } ],
    },
    resolvedIf: function(c, r, event, dueDate) {
      // Only resolved with PNC report received from nurse in time window or a newer pregnancy
      return r.reported_date < getNewestDeliveryTimestamp(c) ||
             r.reported_date < getNewestPregnancyTimestamp(c) ||
             isFormFromArraySubmittedInWindow(c.reports, 'postnatal_visit',
                 Utils.addDate(dueDate, -event.start).getTime(),
                 Utils.addDate(dueDate,  event.end+1).getTime());
    },
  },

  // PNC TASK 3: Assign a missing visit schedule to last SMS of each group
  // Associate tasks to the last message of each group. Be mindful of overflow when peaking ahead!
  {
    name: 'postnatal-missing-visit',
    icon: 'mother-child',
    title: [ { locale:'en', content:'Missing postnatal visit' } ],
    appliesToForms: [ 'D', 'delivery' ],
    appliesIf: function() { return isCoveredByUseCase(c.contact, 'pnc'); },
    appliesToScheduledTaskIf: function(r, i) {
      return i+1 >= r.scheduled_tasks.length ||
          r.scheduled_tasks[i].group !== r.scheduled_tasks[i+1].group;
    },
    priority: function(c, r) {
      if(isHomeBirth(r)) {
        return {
          level: 'high',
          label: [ { locale:'en', content:'Home Birth' } ],
        };
      }
    },
    actions: [ { form:'postnatal_visit' } ],
    events: [ {
      id: 'postnatal-missing-visit',
      days: 1, start: 0, end: 3,
    } ],
    resolvedIf: function(c, r, event, dueDate, i) {
      // Resolved if the scheduled SMS that generated the task is cleared,
      //          if there a visit report received in time window or a newer pregnancy
      return r.scheduled_tasks[i].state === 'cleared' ||
          r.reported_date < getNewestDeliveryTimestamp(c) ||
          r.reported_date < getNewestPregnancyTimestamp(c) ||
          isFormFromArraySubmittedInWindow(c.reports, postnatalForms,
              Utils.addDate(dueDate, -event.start).getTime(),
              Utils.addDate(dueDate,  event.end+1).getTime());
    },
  },

  // IMM Task based on Child Health monthly SMS
  // Assign task to specific age in months corresponding to the group number
  {
    name: 'immunization-missing-visit',
    icon: 'immunization',
    title: [ { locale:'en', content:'Missing immunization visit' } ],
    appliesToForms: [ 'CW', 'child_health_registration' ],
    appliesIf: function() { return isCoveredByUseCase(c.contact, 'imm'); },
    appliesToScheduledTaskIf: function(r, i) { return immunizationMonths.indexOf(r.scheduled_tasks[i].group) !== -1; },
    actions: [ { form:'immunization_visit' } ],
    events: [ {
      id: 'immunization-missing-visit',
      days:21, start:7, end:13,
      // set dueDate explicitly because default dueDate is +28 days and not sure why
      dueDate: function(r,event,i) { return Utils.addDate(new Date(r.scheduled_tasks[i].due), event.days); }
    } ],
    resolvedIf: function(c, r, event, dueDate, i) {
      // Resolved if the scheduled SMS that generated the task is cleared,
      //          if an immunization report has been received in time window starting at SMS send date
      return r.scheduled_tasks[i].state === 'cleared' ||
        isFormFromArraySubmittedInWindow(c.reports, immunizationForms,
          Utils.addDate(dueDate, -event.days).getTime(),
          Utils.addDate(dueDate,  event.end+1).getTime());
    },
  },
]
