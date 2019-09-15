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
  getMostRecentLMPDateForPregnancy,
  addDays,
  getRecentANCVisitWithEvent,
  isPregnancyTaskMuted,
  getField
} = extras;

const generateEventForHomeVisit = (week, start, end) => ({
  id: 'pregnancy-home-visit',
  start,
  end,
  dueDate: function (event, contact, report) {
    const recentLMPDate = getMostRecentLMPDateForPregnancy(contact, report);
    if (recentLMPDate) {return addDays(recentLMPDate, week * 7);}
    return addDays(report.reported_date, week * 7);
  }
});

function checkTaskResolvedForHomeVisit(contact, report, event, dueDate) {
  if (report.reported_date < getNewestDeliveryTimestamp(contact)) {return true;}//delivery form submitted
  if (report.reported_date < getNewestPregnancyTimestamp(contact)) {return true;}//old pregnancy report

  //miscarriage or abortion
  if (getRecentANCVisitWithEvent(contact, report, 'abortion') || getRecentANCVisitWithEvent(contact, report, 'miscarriage')) {return true;}

  //Due date older than reported day
  if (dueDate <= getTimeForMidnight(report.reported_date)) {return true;}

  //clear tasks
  if (isPregnancyTaskMuted(contact)) {return true;}
  const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date);
  const endTime = addDays(dueDate, event.end + 1).getTime();
  return isFormArraySubmittedInWindow(contact.reports, ['pregnancy_home_visit'], startTime, endTime);
}

module.exports = [

  //ANC
  //ANC Home Visit: 12, 20, 26, 30, 34, 36, 38, 40 weeks (Known LMP)
  {
    icon: 'icon-pregnancy',
    title: 'task.anc.pregnancy_home_visit.title',
    appliesTo: 'reports',
    appliesToType: ['pregnancy'],
    appliesIf: function (contact, report) {// If LMP date is known
      return !!getMostRecentLMPDateForPregnancy(contact, report);
    },

    resolvedIf: checkTaskResolvedForHomeVisit,

    actions: [
      {
        type: 'report',
        form: 'pregnancy_home_visit',
        label: 'Pregnancy home visit',
        modifyContent: function (content, contact, report) {
          content.pregnancy_uuid = report._id;
        }
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
    icon: 'icon-pregnancy',
    title: 'task.anc.pregnancy_home_visit.title',
    appliesTo: 'reports',
    appliesToType: ['pregnancy'],
    appliesIf: function (contact, report) {// If LMP date is unknown
      const recentLMP = getMostRecentLMPDateForPregnancy(contact, report);
      //We only want to show until 42 weeks + 7 days
      return !recentLMP && addDays(report.reported_date, 42 * 7 + 7) >= today;
    },

    resolvedIf: checkTaskResolvedForHomeVisit,

    actions: [
      {
        type: 'report',
        form: 'pregnancy_home_visit',
        label: 'Pregnancy home visit',
        modifyContent: function (content, contact, report) {
          content.pregnancy_uuid = report._id;
        }
      }
    ],
    //every two weeks from reported date until 42nd week, show before due date: 6 days, show after due date: 7 days
    events: [...Array(21).keys()].map(i => generateEventForHomeVisit((i + 1) * 2, 6, 7))
  },
  //ANC - Health Facility Visit Reminder
  {
    icon: 'icon-pregnancy',
    title: 'task.anc.facility_reminder.title',
    appliesTo: 'reports',
    appliesToType: ['pregnancy', 'pregnancy_home_visit'],
    appliesIf: function (contact, report) {
      //next pregnancy visit date is entered
      return getField(report, 't_pregnancy_follow_up_date');
    },

    resolvedIf: function (contact, report, event, dueDate) {
      //(refused or migrated) and clear tasks 
      if (isPregnancyTaskMuted(contact)) {return true;}
      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date);
      const endTime = addDays(dueDate, event.end + 1).getTime();
      return isFormArraySubmittedInWindow(contact.reports, ['pregnancy_facility_visit_reminder'], startTime, endTime);

    },
    actions: [{
      type: 'report',
      form: 'pregnancy_facility_visit_reminder',
      label: 'Pregnancy facility visit reminder',
      modifyContent: function (content, contact, report) {
        content.pregnancy_uuid = report._id;
      }
    }
    ],
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
    icon: 'icon-pregnancy-danger',
    title: 'task.anc.pregnancy_danger_sign_followup.title',
    appliesTo: 'reports',
    appliesToType: ['pregnancy', 'pregnancy_home_visit', 'pregnancy_danger_sign', 'pregnancy_danger_sign_follow_up'],
    appliesIf: function (contact, report) {
      return getField(report, 't_danger_signs_referral_follow_up') === 'yes' && isAlive(contact);
    },
    resolvedIf: function (contact, report, event, dueDate) {
      //(refused or migrated) and clear tasks 
      if (isPregnancyTaskMuted(contact)) {return true;}
      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date + 1);//+1 so that source ds_follow_up does not resolve itself
      const endTime = addDays(dueDate, event.end + 1).getTime();
      return isFormArraySubmittedInWindow(contact.reports, ['pregnancy_danger_sign_follow_up'], startTime, endTime);
    },
    actions: [
      {
        type: 'report',
        form: 'pregnancy_danger_sign_follow_up',
        //label: "Pregnancy follow up",
        modifyContent: function (content, contact, report) {
          content.pregnancy_uuid = report._id;
        }
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
    icon: 'icon-mother-child',
    title: 'task.anc.delivery.title',
    appliesTo: 'reports',
    appliesToType: ['pregnancy'],
    appliesIf: function (contact, report) {
      const lmpDate = getMostRecentLMPDateForPregnancy(contact, report); //only for known LMP
      return lmpDate && addDays(lmpDate, 337) >= today && isAlive(contact);
    },
    resolvedIf: function (contact, report, event, dueDate) {
      //miscarriage or abortion
      if (getRecentANCVisitWithEvent(contact, report, 'abortion') || getRecentANCVisitWithEvent(contact, report, 'miscarriage')) {return true;}

      //(refused or migrated) and clear tasks 
      if (isPregnancyTaskMuted(contact)) {return true;}
      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date);
      const endTime = addDays(dueDate, event.end + 1).getTime();
      return isFormArraySubmittedInWindow(contact.reports, ['delivery'], startTime, endTime);
    },
    actions: [
      {
        type: 'report',
        form: 'delivery',
        //label: "Delivery",
        modifyContent: function (content, contact, report) {
          content.pregnancy_uuid = report._id;
        }
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
    icon: 'icon-follow-up',
    title: 'task.pnc.danger_sign_followup_mother.title',
    appliesTo: 'reports',
    appliesToType: ['delivery', 'pnc_danger_sign_follow_up_mother'],
    appliesIf: function (contact, report) {
      return getField(report, 't_danger_signs_referral_follow_up') === 'yes' && isAlive(contact);
    },
    resolvedIf: function (contact, report, event, dueDate) {
      //(refused or migrated) and clear tasks 
      if (isPregnancyTaskMuted(contact)) {return true;}
      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date + 1);//+1 so that source ds_follow_up does not resolve itself;
      const endTime = addDays(dueDate, event.end + 1).getTime();
      return isFormArraySubmittedInWindow(contact.reports, ['pnc_danger_sign_follow_up_mother'], startTime, endTime);
    },
    actions: [
      {
        type: 'report',
        form: 'pnc_danger_sign_follow_up_mother',
        //label: "Pregnancy follow up",
        modifyContent: function (content, contact, report) {
          content.pregnancy_uuid = report._id;
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
        form: 'pnc_danger_sign_follow_up_baby'
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
    icon: 'icon-follow-up',
    title: 'task.pnc.danger_sign_followup_baby.title',
    appliesTo: 'reports',
    appliesToType: ['pnc_danger_sign_follow_up_baby'],
    appliesIf: function (contact, report) {
      return getField(report, 't_danger_signs_referral_follow_up') === 'yes' && isAlive(contact);
    },
    resolvedIf: function (contact, report, event, dueDate) {
      //(refused or migrated) and clear tasks 
      if (isPregnancyTaskMuted(contact)) {return true;}
      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date + 1);//+1 so that source ds_follow_up does not resolve itself
      const endTime = addDays(dueDate, event.end + 1).getTime();
      return isFormArraySubmittedInWindow(contact.reports, ['pnc_danger_sign_follow_up_baby'], startTime, endTime);
    },
    actions: [
      {
        type: 'report',
        form: 'pnc_danger_sign_follow_up_baby',
        //label: "Pregnancy follow up",
        modifyContent: function (content, contact, report) {
          content.pregnancy_uuid = report._id;
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

