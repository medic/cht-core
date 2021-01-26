const extras = require('./nools-extras');

const {
  MAX_DAYS_IN_PREGNANCY,
  today,
  getNewestPregnancyTimestamp,
  getNewestDeliveryTimestamp,
  isAlive,
  isFormArraySubmittedInWindow,
  getDateISOLocal,
  getTimeForMidnight,
  isDeliveryForm,
  getMostRecentLMPDateForPregnancy,
  addDays,
  getRecentANCVisitWithEvent,
  isPregnancyTaskMuted,
  getField
} = extras;

const generateEventForHomeVisit = (week, start, end) => ({
  id: `pregnancy-home-visit-week${week}`,
  start,
  end,
  dueDate: function (event, contact, report) {
    const recentLMPDate = getMostRecentLMPDateForPregnancy(contact, report);
    if (recentLMPDate) { return addDays(recentLMPDate, week * 7); }
    return addDays(report.reported_date, week * 7);
  }
});

function checkTaskResolvedForHomeVisit(contact, report, event, dueDate) {
  //delivery form submitted
  if (report.reported_date < getNewestDeliveryTimestamp(contact)) { return true; }

  //old pregnancy report
  if (report.reported_date < getNewestPregnancyTimestamp(contact)) { return true; }

  //miscarriage or abortion
  if (getRecentANCVisitWithEvent(contact, report, 'abortion') || getRecentANCVisitWithEvent(contact, report, 'miscarriage')) { return true; }

  //Due date older than reported day
  if (dueDate <= getTimeForMidnight(report.reported_date)) { return true; }

  //Tasks cleared
  if (isPregnancyTaskMuted(contact)) { return true; }
  const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date);
  const endTime = addDays(dueDate, event.end + 1).getTime();
  return isFormArraySubmittedInWindow(contact.reports, ['pregnancy_home_visit'], startTime, endTime);
}

module.exports = [

  // MNCH Immunization and Growth follow up 3 days
  {
    name: 'immunization_growth_follow_up_missed_vaccine_date_3',
    icon: 'icon-people-children',
    title: 'Immunization Growth Follow Up',
    appliesTo: 'reports',
    appliesToType: ['immunization_and_growth'],
    actions: [{type: 'report',form: 'immunization_growth_follow_up'}],
    appliesIf: function(contact, report) {
      // todo - use this form or a different one for "urgent referral"? "If any danger sign marked triggers an urgent referral follow up form that"
      // Trigger a immunization follow up form 3 days from the selected date
      return parseInt(getField(report, 'g_missed_vaccine_details.missed_vaccine_date'))  > 0;
    },
    events: [
      {
        id: 'immunization_growth_follow_up_is_set_missed_vaccine_date_3', // todo - verify ID nomenclature and dedupe w/ other calls to immunization_growth_follow_up
        dueDate: function (event, contact, report) {
          return getDateISOLocal(getField(report, 'g_missed_vaccine_details.missed_vaccine_date'));
        },
        start: 3, end: 3 // todo - get correct end and start days
      }
    ],
    resolvedIf: function(contact, report, event, dueDate) {
      return isFormArraySubmittedInWindow(
        contact.reports,
        ['immunization_growth_follow_up'],
        Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date),
        addDays(dueDate, event.end + 1).getTime()
      );
    }
  },

  // MNCH Immunization and Growth follow up deworm_next_date 3 days
  {
    name: 'immunization_growth_follow_up_deworm_next_date_3',
    icon: 'icon-people-children',
    title: 'Immunization Growth Follow Up',
    appliesTo: 'reports',
    appliesToType: ['immunization_and_growth'],
    actions: [{type: 'report',form: 'immunization_growth_follow_up'}],
    appliesIf: function(contact, report) {
      // Trigger a immunization follow up form 3 days from the selected date
      return parseInt(getField(report, 'g_deworming.deworm_next_date'))  > 0;
    },
    events: [
      {
        id: 'immunization_growth_follow_up_is_set_deworm_next_date_3', // todo - verify ID nomenclature and dedupe w/ other calls to immunization_growth_follow_up
        dueDate: function (event, contact, report) {
          return getDateISOLocal(getField(report, 'g_deworming.deworm_next_date'));
        },
        start: 3, end: 3 // todo - get correct end and start days
      }
    ],
    resolvedIf: function(contact, report, event, dueDate) {
      return isFormArraySubmittedInWindow(
        contact.reports,
        ['immunization_growth_follow_up'],
        Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date),
        addDays(dueDate, event.end + 1).getTime()
      );
    }
  },

  // MNCH Immunization and Growth follow up next_appointment_date 3 days
  {
    name: 'immunization_growth_follow_up_next_appointment_date_3',
    icon: 'icon-people-children',
    title: 'Immunization Growth Follow Up',
    appliesTo: 'reports',
    appliesToType: ['immunization_and_growth'],
    actions: [{type: 'report',form: 'immunization_growth_follow_up'}],
    appliesIf: function(contact, report) {
      // Trigger a immunization follow up form 3 days from the selected date
      return parseInt(getField(report, 'g_next_appointment.next_appointment_date'))  > 0;
    },
    events: [
      {
        id: 'immunization_growth_follow_up_is_set_next_appointment_date_3', // todo - verify ID nomenclature and dedupe w/ other calls to immunization_growth_follow_up
        dueDate: function (event, contact, report) {
          return getDateISOLocal(getField(report, 'g_next_appointment.next_appointment_date'));
        },
        start: 3, end: 3 // todo - get correct end and start days
      }
    ],
    resolvedIf: function(contact, report, event, dueDate) {
      return isFormArraySubmittedInWindow(
        contact.reports,
        ['immunization_growth_follow_up'],
        Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date),
        addDays(dueDate, event.end + 1).getTime()
      );
    }
  },

  // MNCH Immunization and Growth follow up developmental_milestones 7 days
  {
    name: 'immunization_growth_follow_up_developmental_milestones',
    icon: 'icon-people-children',
    title: 'Immunization Growth Follow Up',
    appliesTo: 'reports',
    appliesToType: ['immunization_and_growth'],
    actions: [{type: 'report',form: 'immunization_growth_follow_up'}],
    appliesIf: function(contact, report) {
      // Trigger a child development referral follow up task 7days from the  selected date. The task should stay for 3 more days
      return parseInt(getField(report, 'g_developmental_milestones.developmental_next_assignment_date'))  > 0;
    },
    events: [
      {
        id: 'immunization_growth_follow_up_is_set_developmental_milestones_7', // todo - verify ID nomenclature and dedupe w/ other calls to immunization_growth_follow_up
        dueDate: function (event, contact, report) { return getDateISOLocal(getField(report, 'g_developmental_milestones.developmental_next_assignment_date')); },
        start: 7, end: 3 // todo - get correct end and start days
      }
    ],
    resolvedIf: function(contact, report, event, dueDate) {
      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date);
      const endTime = addDays(dueDate, event.end + 1).getTime();
      return isFormArraySubmittedInWindow(
        contact.reports, ['immunization_growth_follow_up'], startTime, endTime
      );
    }
  },

  // MNCH Immunization and Growth follow up child_referral_follow_up 1 day
  {
    name: 'immunization_growth_child_referral_follow_up',
    icon: 'icon-followup-general',
    title: 'Child referral follow up',
    appliesTo: 'reports',
    appliesToType: ['immunization_and_growth'],
    actions: [{type: 'report',form: 'child_referral_follow_up'}],
    appliesIf: function(contact, report) {
      // Trigger a child development referral follow up task 21days from the  reported_date. The task should stay for 3 more days
      return getField(report, 'any_danger') === 'yes';
    },
    events: [
      {
        id: 'immunization_growth_child_referral_follow_up', // todo - verify ID nomenclature and dedupe w/ other calls to immunization_growth_follow_up
        days: 1, start: 1, end: 3 // todo - get correct end and start days
      }
    ],
    resolvedIf: function(contact, report, event, dueDate) {
      console.log('dueDate: ', dueDate);
      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date);
      const endTime = addDays(dueDate, event.end + 1).getTime();
      return isFormArraySubmittedInWindow(
        contact.reports, ['child_referral_follow_up'], startTime, endTime
      );
    }
  },


  // MNCH Child assessment two_mo_referred_yes 3 day
  {
    name: 'two_mo_referred',
    icon: 'icon-followup-general',
    title: 'Child referral follow up',
    appliesTo: 'reports',
    appliesToType: ['child_assessment'],
    actions: [{type: 'report',form: 'child_referral_follow_up'}],
    appliesIf: function(contact, report) {
      console.log('g_two_mo_assessment.two_mo_referred',getField(report, 'g_two_mo_assessment.two_mo_referred'));
      // Mark as referral for danger signs of newborns, Go to summary page & end form. Triggers a child referral follow up that starts in 3 days and stays for 3 days
      return getField(report, 'g_two_mo_assessment.two_mo_referred') === 'yes';
    },
    events: [
      {
        id: 'immunization_growth_child_referral_follow_up', // todo - verify ID nomenclature and dedupe w/ other calls to immunization_growth_follow_up
        days: 3, start: 1, end: 3 // todo - get correct end and start days
      }
    ],
    resolvedIf: function(contact, report, event, dueDate) { // todo - this doesn't seem to resolve task
      console.log('dueDate: ', dueDate);
      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date);
      const endTime = addDays(dueDate, event.end + 1).getTime();
      return isFormArraySubmittedInWindow(
        contact.reports, ['child_referral_follow_up'], startTime, endTime
      );
    }
  },

  //ANC Home Visit: 12, 20, 26, 30, 34, 36, 38, 40 weeks (Known LMP)
  {
    name: 'anc.pregnancy_home_visit.known_lmp',
    icon: 'icon-pregnancy',
    title: 'task.anc.pregnancy_home_visit.title',
    appliesTo: 'reports',
    appliesToType: ['pregnancy'],
    appliesIf: function (contact, report) {
      // If LMP date is known
      return !!getMostRecentLMPDateForPregnancy(contact, report);
    },

    resolvedIf: checkTaskResolvedForHomeVisit,

    actions: [
      {
        type: 'report',
        form: 'pregnancy_home_visit',
        label: 'Pregnancy home visit'
      }
    ],
    events: [
      generateEventForHomeVisit(12, 7, 14),
      generateEventForHomeVisit(20, 7, 14),
      generateEventForHomeVisit(26, 7, 14),
      generateEventForHomeVisit(30, 7, 14),
      generateEventForHomeVisit(34, 6, 7),
      generateEventForHomeVisit(36, 6, 7),
      generateEventForHomeVisit(38, 6, 7),
      generateEventForHomeVisit(40, 6, 7)
    ]
  },

  //ANC Home Visit: show every 2 weeks (Unknown LMP)
  {
    name: 'anc.pregnancy_home_visit.unknown_lmp',
    icon: 'icon-pregnancy',
    title: 'task.anc.pregnancy_home_visit.title',
    appliesTo: 'reports',
    appliesToType: ['pregnancy'],
    appliesIf: function (contact, report) {// If LMP date is unknown
      const recentLMP = getMostRecentLMPDateForPregnancy(contact, report);
      //We only want to show until 42 weeks + 7 days
      return !recentLMP && addDays(report.reported_date, MAX_DAYS_IN_PREGNANCY + 7) >= today;
    },

    resolvedIf: checkTaskResolvedForHomeVisit,

    actions: [
      {
        type: 'report',
        form: 'pregnancy_home_visit',
        label: 'Pregnancy home visit'
      }
    ],
    //every two weeks from reported date until 42nd week, show before due date: 6 days, show after due date: 7 days
    events: [...Array(21).keys()].map(i => generateEventForHomeVisit((i + 1) * 2, 6, 7))
  },

  //ANC - Health Facility Visit Reminder
  {
    name: 'anc.facility_reminder',
    icon: 'icon-pregnancy',
    title: 'task.anc.facility_reminder.title',
    appliesTo: 'reports',
    appliesToType: ['pregnancy', 'pregnancy_home_visit'],
    appliesIf: function (contact, report) {
      //next pregnancy visit date is entered
      return getField(report, 't_pregnancy_follow_up_date');
    },

    resolvedIf: function (contact, report, event, dueDate) {
      //(refused or migrated) and cleared tasks
      if (isPregnancyTaskMuted(contact)) { return true; }
      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date);
      const endTime = addDays(dueDate, event.end + 1).getTime();
      return isFormArraySubmittedInWindow(contact.reports, ['pregnancy_facility_visit_reminder'], startTime, endTime);

    },
    actions: [{
      type: 'report',
      form: 'pregnancy_facility_visit_reminder',
      label: 'Pregnancy facility visit reminder',
      modifyContent: function (content, contact, report) {
        content.source_visit_date = getField(report, 't_pregnancy_follow_up_date');
      }
    }],
    events: [{
      id: 'pregnancy-facility-visit-reminder',
      start: 3,
      end: 7,
      dueDate: function (event, contact, report) {
        //next visit date
        return getDateISOLocal(getField(report, 't_pregnancy_follow_up_date'));
      }
    }
    ]
  },

  {
    name: 'anc.pregnancy_danger_sign_followup',
    icon: 'icon-pregnancy-danger',
    title: 'task.anc.pregnancy_danger_sign_followup.title',
    appliesTo: 'reports',
    appliesToType: ['pregnancy', 'pregnancy_home_visit', 'pregnancy_danger_sign', 'pregnancy_danger_sign_follow_up'],
    appliesIf: function (contact, report) {
      return getField(report, 't_danger_signs_referral_follow_up') === 'yes' && isAlive(contact);
    },
    resolvedIf: function (contact, report, event, dueDate) {
      //(refused or migrated) and cleared tasks
      if (isPregnancyTaskMuted(contact)) { return true; }
      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date + 1);
      const endTime = addDays(dueDate, event.end + 1).getTime();
      return isFormArraySubmittedInWindow(contact.reports, ['pregnancy_danger_sign_follow_up'], startTime, endTime);
    },
    actions: [
      {
        type: 'report',
        form: 'pregnancy_danger_sign_follow_up'
      }
    ],
    events: [
      {
        id: 'pregnancy-danger-sign-follow-up',
        start: 3,
        end: 7,
        dueDate: function (event, contact, report) {
          return getDateISOLocal(getField(report, 't_danger_signs_referral_follow_up_date'));
        }
      }
    ]
  },

  {
    name: 'anc.delivery',
    icon: 'icon-mother-child',
    title: 'task.anc.delivery.title',
    appliesTo: 'reports',
    appliesToType: ['pregnancy'],
    appliesIf: function (contact, report) {
      const lmpDate = getMostRecentLMPDateForPregnancy(contact, report);
      //only for known LMP, show for maximum of 42 + 6 weeks
      return lmpDate && addDays(lmpDate, 336) >= today && isAlive(contact);
    },
    resolvedIf: function (contact, report, event, dueDate) {
      //miscarriage or abortion
      if (getRecentANCVisitWithEvent(contact, report, 'abortion') || getRecentANCVisitWithEvent(contact, report, 'miscarriage')) { return true; }

      //(refused or migrated) and cleared tasks
      if (isPregnancyTaskMuted(contact)) { return true; }
      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date);
      const endTime = addDays(dueDate, event.end + 1).getTime();
      return isFormArraySubmittedInWindow(contact.reports, ['delivery'], startTime, endTime);
    },
    actions: [
      {
        type: 'report',
        form: 'delivery'
      }
    ],
    events: [
      {
        id: 'delivery-reminder',
        start: 4 * 7,
        end: 6 * 7,
        dueDate: function (event, contact, report) {
          return addDays(getMostRecentLMPDateForPregnancy(contact, report), MAX_DAYS_IN_PREGNANCY); //LMP + 42 weeks
        }
      }
    ]
  },

  {
    name: 'pnc.danger_sign_followup_mother',
    icon: 'icon-follow-up',
    title: 'task.pnc.danger_sign_followup_mother.title',
    appliesTo: 'reports',
    appliesToType: ['delivery', 'pnc_danger_sign_follow_up_mother'],
    appliesIf: function (contact, report) {
      return getField(report, 't_danger_signs_referral_follow_up') === 'yes' && isAlive(contact);
    },
    resolvedIf: function (contact, report, event, dueDate) {
      //(refused or migrated) and cleared tasks
      if (isPregnancyTaskMuted(contact)) { return true; }
      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date + 1);//+1 so that source ds_follow_up does not resolve itself;
      const endTime = addDays(dueDate, event.end + 1).getTime();
      return isFormArraySubmittedInWindow(contact.reports, ['pnc_danger_sign_follow_up_mother'], startTime, endTime);
    },
    actions: [
      {
        type: 'report',
        form: 'pnc_danger_sign_follow_up_mother',
        modifyContent: function (content, contact, report) {
          if (isDeliveryForm(report)) {
            content.delivery_uuid = report._id;
          }
          else {
            content.delivery_uuid = getField(report, 'inputs.delivery_uuid');
          }
        }
      }
    ],
    events: [
      {
        id: 'pnc-danger-sign-follow-up-mother',
        start: 3,
        end: 7,
        dueDate: function (event, contact, report) {
          return getDateISOLocal(getField(report, 't_danger_signs_referral_follow_up_date'));
        }
      }
    ]
  },

  {
    name: 'pnc.danger_sign_followup_baby.from_contact',
    icon: 'icon-follow-up',
    title: 'task.pnc.danger_sign_followup_baby.title',
    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: function (contact) {
      return contact.contact &&
        contact.contact.t_danger_signs_referral_follow_up === 'yes' &&
        isAlive(contact);
    },
    resolvedIf: function (contact, report, event, dueDate) {
      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), contact.contact.reported_date);
      const endTime = addDays(dueDate, event.end).getTime();
      return isFormArraySubmittedInWindow(contact.reports, ['pnc_danger_sign_follow_up_baby'], startTime, endTime);
    },
    actions: [
      {
        type: 'report',
        form: 'pnc_danger_sign_follow_up_baby',
        modifyContent: function (content, contact) {
          content.delivery_uuid = contact.contact.created_by_doc;
        }
      }
    ],
    events: [
      {
        id: 'pnc-danger-sign-follow-up-baby',
        start: 3,
        end: 7,
        dueDate: function (event, contact) {
          return getDateISOLocal(contact.contact.t_danger_signs_referral_follow_up_date);
        }
      }
    ]
  },

  {
    name: 'pnc.danger_sign_followup_baby.from_report',
    icon: 'icon-follow-up',
    title: 'task.pnc.danger_sign_followup_baby.title',
    appliesTo: 'reports',
    appliesToType: ['pnc_danger_sign_follow_up_baby'],
    appliesIf: function (contact, report) {
      return getField(report, 't_danger_signs_referral_follow_up') === 'yes' && isAlive(contact);
    },
    resolvedIf: function (contact, report, event, dueDate) {
      //(refused or migrated) and cleared tasks
      if (isPregnancyTaskMuted(contact)) { return true; }
      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date + 1);
      //reported_date + 1 so that source ds_follow_up does not resolve itself
      const endTime = addDays(dueDate, event.end + 1).getTime();
      return isFormArraySubmittedInWindow(contact.reports, ['pnc_danger_sign_follow_up_baby'], startTime, endTime);
    },
    actions: [
      {
        type: 'report',
        form: 'pnc_danger_sign_follow_up_baby',
        modifyContent: function (content, contact, report) {
          content.delivery_uuid = getField(report, 'inputs.delivery_uuid');
        }
      }
    ],
    events: [
      {
        id: 'pnc-danger-sign-follow-up-baby',
        start: 3,
        end: 7,
        dueDate: function (event, contact, report) {
          return getDateISOLocal(getField(report, 't_danger_signs_referral_follow_up_date'));
        }
      }
    ]
  }
];

