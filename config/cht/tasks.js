const extras = require('./nools-extras');

const {
  today,
  getNewestPregnancyTimestamp,
  getNewestDeliveryTimestamp,
  isAlive,
  isFormArraySubmittedInWindow,
  getDateMS,
  getDateISOLocal,
  getTimeForMidnight,
  getMostRecentLMPDateForPregnancy,
  addDays,
  getRecentANCVisitWithEvent,
  isPregnancyTaskMuted,
  getField
} = extras;

module.exports = [

  //ANC
  //ANC Home Visit: 12, 20, 26, 30, 34, 36, 38, 40 weeks (Known LMP)
  {
    icon: "icon-pregnancy",
    title: "task.anc.pregnancy_home_visit.title",
    appliesTo: "reports",
    appliesToType: ["pregnancy"],
    appliesIf: function (contact, report) {// If LMP date is known
      return getMostRecentLMPDateForPregnancy(contact, report) != null;
    },

    resolvedIf: function (contact, report, event, dueDate) {
      if (report.reported_date < getNewestDeliveryTimestamp(contact)) return true;//delivery form submitted
      if (report.reported_date < getNewestPregnancyTimestamp(contact)) return true;//old pregnancy report

      //miscarriage or abortion
      if (getRecentANCVisitWithEvent(contact, report, 'abortion') || getRecentANCVisitWithEvent(contact, report, 'miscarriage')) return true;

      //Due date older than reported day
      if (dueDate <= getTimeForMidnight(report.reported_date)) return true;

      //clear tasks
      if (isPregnancyTaskMuted(contact)) return true;

      return isFormArraySubmittedInWindow(contact.reports, ['pregnancy_home_visit'],
        Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date),
        addDays(dueDate, event.end + 1).getTime());
    },

    actions: [
      {
        type: "report",
        form: "pregnancy_home_visit",
        label: "Pregnancy home visit",
        modifyContent: function (content, contact, report) {
          content.source = 'task';
          content.source_id = report._id;
          content.contact = contact.contact;
          content.pregnancy_uuid = report._id;
        }
      }
    ],
    events: [
      {
        id: "pregnancy-home-visit",
        start: 7, //shows 1 day later - if using new Date()
        end: 14,
        dueDate: function (event, contact, report) {
          return addDays(getMostRecentLMPDateForPregnancy(contact, report), 12 * 7);
        }
      },
      {
        id: "pregnancy-home-visit",
        start: 7,
        end: 14,
        dueDate: function (event, contact, report) {
          return addDays(getMostRecentLMPDateForPregnancy(contact, report), 20 * 7);
        }
      },
      {
        id: "pregnancy-home-visit",
        start: 7,
        end: 14,
        dueDate: function (event, contact, report) {
          return addDays(getMostRecentLMPDateForPregnancy(contact, report), 26 * 7);
        }
      },
      {
        id: "pregnancy-home-visit",
        start: 7,
        end: 14,
        dueDate: function (event, contact, report) {
          return addDays(getMostRecentLMPDateForPregnancy(contact, report), 30 * 7);
        }
      },
      {
        id: "pregnancy-home-visit",
        start: 6,
        end: 7,
        dueDate: function (event, contact, report) {
          return addDays(getMostRecentLMPDateForPregnancy(contact, report), 34 * 7);
        }
      },
      {
        id: "pregnancy-home-visit",
        start: 6,
        end: 7,
        dueDate: function (event, contact, report) {
          return addDays(getMostRecentLMPDateForPregnancy(contact, report), 36 * 7);
        }
      },
      {
        id: "pregnancy-home-visit",
        start: 6,
        end: 7,
        dueDate: function (event, contact, report) {
          return addDays(getMostRecentLMPDateForPregnancy(contact, report), 38 * 7);
        }
      },
      {
        id: "pregnancy-home-visit",
        start: 6,
        end: 7,
        dueDate: function (event, contact, report) {
          return addDays(getMostRecentLMPDateForPregnancy(contact, report), 40 * 7);
        }
      }
    ]
  },

  //ANC Home Visit: show every 2 weeks (Unknown LMP)
  {
    icon: "icon-pregnancy",
    title: "task.anc.pregnancy_home_visit.title",
    appliesTo: "reports",
    appliesToType: ["pregnancy"],
    appliesIf: function (contact, report) {// If LMP date is unknown
      const recentLMP = getMostRecentLMPDateForPregnancy(contact, report);
      //We only want to show until 42 weeks + 7 days
      return recentLMP === null && addDays(report.reported_date, 42 * 7 + 7) >= today;
    },

    resolvedIf: function (contact, report, event, dueDate) {
      if (report.reported_date < getNewestDeliveryTimestamp(contact)) return true;//delivery form submitted
      if (report.reported_date < getNewestPregnancyTimestamp(contact)) return true;//old pregnancy report

      //miscarriage or abortion
      if (getRecentANCVisitWithEvent(contact, report, 'abortion') || getRecentANCVisitWithEvent(contact, report, 'miscarriage')) return true;

      //(refused or migrated) and clear tasks 
      if (isPregnancyTaskMuted(contact)) return true;

      return isFormArraySubmittedInWindow(contact.reports, ['pregnancy_home_visit'],
        Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date),
        addDays(dueDate, event.end + 1).getTime());
    },

    actions: [
      {
        type: "report",
        form: "pregnancy_home_visit",
        label: "Pregnancy home visit",
        modifyContent: function (content, contact, report) {
          content.source = 'task';
          content.source_id = report._id;
          content.contact = contact.contact;
          content.pregnancy_uuid = report._id;
        }
      }
    ],
    events: [
      {
        id: "pregnancy-home-visit",
        start: 6,
        end: 7,
        dueDate: function (event, contact, report) { //every two weeks since registration
          let upcomingDate = addDays(getDateMS(report.reported_date), 14);
          let countLoops = 0;
          while ((upcomingDate < addDays(report.reported_date, 14) || upcomingDate < addDays(today, -7))) {
            upcomingDate = addDays(upcomingDate, 14);
            countLoops++;
            if (countLoops > 25) {//14*25 = 350 days
              console.error("Loop ran for 25 times, stopped", upcomingDate, addDays(report.reported_date, 13), addDays(today, -4), today);
              break;
            }
          }
          return getDateMS(upcomingDate);
        }
      }
    ]
  },
  //ANC - Health Facility Visit Reminder
  {
    icon: "icon-pregnancy",
    title: "task.anc.facility_reminder.title",
    appliesTo: "reports",
    appliesToType: ['pregnancy', 'pregnancy_home_visit'],
    appliesIf: function (contact, report) {
      //next pregnancy visit date is entered
      return getField(report, 't_pregnancy_follow_up_date');
    },

    resolvedIf: function (contact, report, event, dueDate) {
      //(refused or migrated) and clear tasks 
      if (isPregnancyTaskMuted(contact)) return true;

      return isFormArraySubmittedInWindow(contact.reports, ['pregnancy_facility_visit_reminder'],
        Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date),
        addDays(dueDate, event.end + 1).getTime());
    },
    actions: [{
      type: "report",
      form: "pregnancy_facility_visit_reminder",
      label: "Pregnancy facility visit reminder",
      modifyContent: function (content, contact, report) {
        content.source = 'task';
        content.source_id = report._id;
        content.contact = contact.contact;
        content.pregnancy_uuid = report._id;
      }
    }
    ],
    events: [{
      id: "pregnancy-facility-visit-reminder",
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
    icon: "icon-pregnancy-danger",
    title: "task.anc.pregnancy_danger_sign_followup.title",
    appliesTo: "reports",
    appliesToType: ["pregnancy", "pregnancy_home_visit", "pregnancy_danger_sign", "pregnancy_danger_sign_follow_up"],
    appliesIf: function (contact, report) {
      return getField(report, 't_danger_signs_referral_follow_up') === 'yes' && isAlive(contact);
    },
    resolvedIf: function (contact, report, event, dueDate) {
      //(refused or migrated) and clear tasks 
      if (isPregnancyTaskMuted(contact)) return true;

      return isFormArraySubmittedInWindow(contact.reports, ['pregnancy_danger_sign_follow_up'],
        Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date + 1),//+1 so that source ds_follow_up does not resolve itself
        addDays(dueDate, event.end + 1).getTime());
    },
    actions: [
      {
        type: "report",
        form: "pregnancy_danger_sign_follow_up",
        //label: "Pregnancy follow up",
        modifyContent: function (content, contact, report) {
          content.source = 'task';
          content.source_id = report._id;
          content.contact = contact.contact;
          content.pregnancy_uuid = report._id;
        }
      }
    ],
    events: [
      {
        id: "pregnancy-danger-sign-follow-up",
        start: 3,
        end: 7,
        dueDate: function (event, contact, report) {
          return getDateISOLocal(getField(report, 't_danger_signs_referral_follow_up_date'));
        }
      }
    ]
  },

  {
    icon: "icon-mother-child",
    title: "task.anc.delivery.title",
    appliesTo: "reports",
    appliesToType: ["pregnancy"],
    appliesIf: function (contact, report) {
      const lmpDate = getMostRecentLMPDateForPregnancy(contact, report); //only for known LMP
      return lmpDate && addDays(lmpDate, 337) >= today && isAlive(contact);
    },
    resolvedIf: function (contact, report, event, dueDate) {
      //miscarriage or abortion
      if (getRecentANCVisitWithEvent(contact, report, 'abortion') || getRecentANCVisitWithEvent(contact, report, 'miscarriage')) return true;

      //(refused or migrated) and clear tasks 
      if (isPregnancyTaskMuted(contact)) return true;
      return isFormArraySubmittedInWindow(contact.reports, ['delivery'],
        Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date),
        addDays(dueDate, event.end + 1).getTime());
    },
    actions: [
      {
        type: "report",
        form: "delivery",
        //label: "Delivery",
        modifyContent: function (content, contact, report) {
          content.source = 'task';
          content.source_id = report._id;
          content.contact = contact.contact;
          content.pregnancy_uuid = report._id;
        }
      }
    ],
    events: [
      {
        id: "delivery-reminder",
        start: 28, //due - 4 weeks 
        end: 42, //due + 6 weeks
        dueDate: function (event, contact, report) {
          return addDays(getMostRecentLMPDateForPregnancy(contact, report), 294); //LMP + 42 weeks
        }
      }
    ]
  },

  {
    icon: "icon-follow-up",
    title: "task.pnc.danger_sign_followup_mother.title",
    appliesTo: "reports",
    appliesToType: ["delivery", "pnc_danger_sign_follow_up_mother"],
    appliesIf: function (contact, report) {
      return getField(report, 't_danger_signs_referral_follow_up') === 'yes' && isAlive(contact);
    },
    resolvedIf: function (contact, report, event, dueDate) {
      //(refused or migrated) and clear tasks 
      if (isPregnancyTaskMuted(contact)) return true;

      return isFormArraySubmittedInWindow(contact.reports, ['pnc_danger_sign_follow_up_mother'],
        Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date + 1),//+1 so that source ds_follow_up does not resolve itself
        addDays(dueDate, event.end + 1).getTime());
    },
    actions: [
      {
        type: "report",
        form: "pnc_danger_sign_follow_up_mother",
        //label: "Pregnancy follow up",
        modifyContent: function (content, contact, report) {
          content.source = 'task';
          content.source_id = report._id;
          content.contact = contact.contact;
          content.pregnancy_uuid = report._id;
        }
      }
    ],
    events: [
      {
        id: "pnc-danger-sign-follow-up-mother",
        start: 3,
        end: 7,
        dueDate: function (event, contact, report) {
          return getDateISOLocal(getField(report, 't_danger_signs_referral_follow_up_date'));
        }
      }
    ]
  },

  {
    icon: "icon-follow-up",
    title: "task.pnc.danger_sign_followup_baby.title",
    appliesTo: "contacts",
    appliesToType: ["person"],
    appliesIf: function (contact) {
      return contact.contact &&
        contact.contact.t_danger_signs_referral_follow_up === 'yes' &&
        isAlive(contact);
    },
    resolvedIf: function (contact, report, event, dueDate) {
      return isFormArraySubmittedInWindow(contact.reports, ['pnc_danger_sign_follow_up_baby'],
        Math.max(addDays(dueDate, -event.start).getTime(), contact.contact.reported_date),
        addDays(dueDate, event.end).getTime());
    },
    actions: [
      {
        type: "report",
        form: "pnc_danger_sign_follow_up_baby",
        modifyContent: function (content, contact) {
          content.source = 'task';
          content.source_id = contact._id;
          content.contact = contact.contact;
        }
      }
    ],
    events: [
      {
        id: "pnc-danger-sign-follow-up-baby",
        start: 3,
        end: 7,
        dueDate: function (event, contact) {
          return getDateISOLocal(contact.contact.t_danger_signs_referral_follow_up_date);
        }
      }
    ]
  },
  {
    icon: "icon-follow-up",
    title: "task.pnc.danger_sign_followup_baby.title",
    appliesTo: "reports",
    appliesToType: ["pnc_danger_sign_follow_up_baby"],
    appliesIf: function (contact, report) {
      return getField(report, 't_danger_signs_referral_follow_up') === 'yes' && isAlive(contact);
    },
    resolvedIf: function (contact, report, event, dueDate) {
      //(refused or migrated) and clear tasks 
      if (isPregnancyTaskMuted(contact)) return true;

      return isFormArraySubmittedInWindow(contact.reports, ['pnc_danger_sign_follow_up_baby'],
        Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date + 1),//+1 so that source ds_follow_up does not resolve itself
        addDays(dueDate, event.end + 1).getTime());
    },
    actions: [
      {
        type: "report",
        form: "pnc_danger_sign_follow_up_baby",
        //label: "Pregnancy follow up",
        modifyContent: function (content, contact, report) {
          content.source = 'task';
          content.source_id = report._id;
          content.contact = contact.contact;
          content.pregnancy_uuid = report._id;
        }
      }
    ],
    events: [
      {
        id: "pnc-danger-sign-follow-up-baby",
        start: 3,
        end: 7,
        dueDate: function (event, contact, report) {
          return getDateISOLocal(getField(report, 't_danger_signs_referral_follow_up_date'));
        }
      }
    ]
  }
];
