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
} = extras;

module.exports = [

  //ANC
  //ANC Home Visit: 12, 20, 26, 30, 34, 36, 38, 40 weeks (Known LMP)
  {
    icon: "icon-pregnancy",
    title: "task.anc.pregnancy_home_visit.title",
    appliesTo: "reports",
    appliesToType: ["pregnancy"],
    appliesIf: function (c, r) {// If LMP date is known
      const recentLMP = getMostRecentLMPDateForPregnancy(c, r);
      let x = recentLMP !== null;
      //console.log('l', new Date(recentLMP));
      //console.log('applies', x, c.contact.name);
      return x;
    },

    resolvedIf: function (c, r, event, dueDate) {
      //console.log('ddr', dueDate);
      if (r.reported_date < getNewestDeliveryTimestamp(c)) return true;//delivery form submitted
      if (r.reported_date < getNewestPregnancyTimestamp(c)) return true;//old pregnancy report

      //miscarriage or abortion
      if (getRecentANCVisitWithEvent(c, r, 'abortion') || getRecentANCVisitWithEvent(c, r, 'miscarriage')) return true;

      //Due date older than reported day
      if(dueDate <= getTimeForMidnight(r.reported_date)) return true;

      //clear tasks
      if (isPregnancyTaskMuted(c)) return true;

      let x = isFormArraySubmittedInWindow(c.reports, ['pregnancy_home_visit'],
        Math.max(addDays(dueDate, -event.start).getTime(), r.reported_date),
        addDays(dueDate, event.end + 1).getTime());
      //console.log('resolved by visit report', x);
      //let x = false;
      return x;
    },

    actions: [
      {
        type: "report",
        form: "pregnancy_home_visit",
        label: "Pregnancy home visit",
        modifyContent: function (content, c, r) {
          content.source = 'task';
          content.source_id = r._id;
          content.contact = c.contact;
          content.pregnancy_uuid = r._id;
          //content.lmp_date_8601 = r.fields.lmp_date_8601;
          //content.edd_8601 = r.fields.edd_8601;
          //content.weeks_since_lmp = r.fields.weeks_since_lmp;
        }
      }
    ],
    events: [
      {
        id: "pregnancy-home-visit",
        start: 7, //shows 1 day later - if using new Date()
        end: 14,
        dueDate: function (e, c, r) {
          //console.log('dd');
          let x = addDays(getMostRecentLMPDateForPregnancy(c, r), 12 * 7);
          //let x = new Date('2019-06-29');
          //console.log('due date', x);
          return x;
        }
      },
      {
        id: "pregnancy-home-visit",
        start: 7,
        end: 14,
        dueDate: function (e, c, r) {
          //console.log('r1', r);
          return addDays(getMostRecentLMPDateForPregnancy(c, r), 20 * 7);
        }
      },
      {
        id: "pregnancy-home-visit",
        start: 7,
        end: 14,
        dueDate: function (e, c, r) {
          //console.log('r1', r);
          return addDays(getMostRecentLMPDateForPregnancy(c, r), 26 * 7);
        }
      },
      {
        id: "pregnancy-home-visit",
        start: 7,
        end: 14,
        dueDate: function (e, c, r) {
          //console.log('r1', r);
          return addDays(getMostRecentLMPDateForPregnancy(c, r), 30 * 7);
        }
      },
      {
        id: "pregnancy-home-visit",
        start: 6,
        end: 7,
        dueDate: function (e, c, r) {
          //console.log('r1', r);
          return addDays(getMostRecentLMPDateForPregnancy(c, r), 34 * 7);
        }
      },
      {
        id: "pregnancy-home-visit",
        start: 6,
        end: 7,
        dueDate: function (e, c, r) {
          //console.log('r1', r);
          return addDays(getMostRecentLMPDateForPregnancy(c, r), 36 * 7);
        }
      },
      {
        id: "pregnancy-home-visit",
        start: 6,
        end: 7,
        dueDate: function (e, c, r) {
          //console.log('r1', r);
          return addDays(getMostRecentLMPDateForPregnancy(c, r), 38 * 7);
        }
      },
      {
        id: "pregnancy-home-visit",
        start: 6,
        end: 7,
        dueDate: function (e, c, r) {
          //console.log('r1', r);
          return addDays(getMostRecentLMPDateForPregnancy(c, r), 40 * 7);
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
    appliesIf: function (c, r) {// If LMP date is unknown
      const recentLMP = getMostRecentLMPDateForPregnancy(c, r);
      const x = recentLMP === null;
      //We only want to show until 42 weeks + 7 days
      const y = addDays(r.reported_date, 42 * 7 + 7) >= today;
      //console.log('applies-f', x, y, r.reported_date, today);
      return x && y;
    },

    resolvedIf: function (c, r, event, dueDate) {
      //console.log('ddr', dueDate);
      if (r.reported_date < getNewestDeliveryTimestamp(c)) return true;//delivery form submitted
      if (r.reported_date < getNewestPregnancyTimestamp(c)) return true;//old pregnancy report

      //miscarriage or abortion
      if (getRecentANCVisitWithEvent(c, r, 'abortion') || getRecentANCVisitWithEvent(c, r, 'miscarriage')) return true;

      //(refused or migrated) and clear tasks 
      if (isPregnancyTaskMuted(c)) return true;

      let x = isFormArraySubmittedInWindow(c.reports, ['pregnancy_home_visit'],
        Math.max(addDays(dueDate, -event.start).getTime(), r.reported_date),
        addDays(dueDate, event.end + 1).getTime());
      //console.log('resolved by visit report', x);
      //let x = false;
      //console.log('resolved', x);
      return x;
    },

    actions: [
      {
        type: "report",
        form: "pregnancy_home_visit",
        label: "Pregnancy home visit",
        modifyContent: function (content, c, r) {
          content.source = 'task';
          content.source_id = r._id;
          content.contact = c.contact;
          content.pregnancy_uuid = r._id;
          //content.lmp_date_8601 = r.fields.lmp_date_8601;
          //content.edd_8601 = r.fields.edd_8601;
          //content.weeks_since_lmp = r.fields.weeks_since_lmp;
        }
      }
    ],
    events: [
      {
        id: "pregnancy-home-visit",
        start: 6,
        end: 7,
        dueDate: function (e, c, r) { //every two weeks since registration
          //console.log('now', now);
          let upcomingDate = addDays(getDateMS(r.reported_date), 14);
          let countLoops = 0;
          while ((upcomingDate < addDays(r.reported_date, 14) || upcomingDate < addDays(today, -7))) {
            //console.log("loop count", countLoops, upcomingDate, addDays(r.reported_date, 13), addDays(today, -4), today);
            upcomingDate = addDays(upcomingDate, 14);
            countLoops++;
            if (countLoops > 25) {//14*25 = 350 days
              console.log("Loop ran for 25 times, stopped", upcomingDate, addDays(r.reported_date, 13), addDays(today, -4), today);
              break;
            }
          }
          //let x = new Date('2019-06-29');
          //console.log('due date', c.contact.name, upcomingDate);
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
    appliesIf: function (c, r) {
      //next pregnancy visit date is entered
      let x = (r.fields && r.fields.t_pregnancy_follow_up_date);
      //console.log('a2', x);
      return x;
    },

    resolvedIf: function (c, r, event, dueDate) {
      //console.log(dueDate);
      //(refused or migrated) and clear tasks 
      if (isPregnancyTaskMuted(c)) return true;

      let x = isFormArraySubmittedInWindow(c.reports, ['pregnancy_facility_visit_reminder'],
        Math.max(addDays(dueDate, -event.start).getTime(), r.reported_date),
        addDays(dueDate, event.end + 1).getTime());


      //console.log('resolved by visit reminder report', x);
      //console.log('r2', x);
      return x;
    },
    actions: [{
      type: "report",
      form: "pregnancy_facility_visit_reminder",
      label: "Pregnancy facility visit reminder",
      modifyContent: function (content, c, r) {
        content.source = 'task';
        content.source_id = r._id;
        content.contact = c.contact;
        content.pregnancy_uuid = r._id;
        //content.lmp_date_8601 = r.fields.lmp_date_8601;
        //content.edd_8601 = r.fields.edd_8601;
        //content.weeks_since_lmp = r.fields.weeks_since_lmp;
      }
    }
    ],
    events: [{
      id: "pregnancy-facility-visit-reminder",
      start: 3,
      end: 7,
      dueDate: function (e, c, r) {
        /* console.log('dd');
        let x = addDays(getMostRecentLMPDateForPregnancy(c, r), 12 * 7);
        //let x = r.reported_date;
         */
        //next visit date
        let x = getDateISOLocal(r.fields.t_pregnancy_follow_up_date);
        //console.log('due date facility visit', x);
        return x;
      }
    }
    ]
  },
  {
    icon: "icon-pregnancy-danger",
    title: "task.anc.pregnancy_danger_sign_followup.title",
    appliesTo: "reports",
    appliesToType: ["pregnancy", "pregnancy_home_visit", "pregnancy_danger_sign", "pregnancy_danger_sign_follow_up"],
    appliesIf: function (c, r) {
      //console.log(r.fields.t_danger_signs_referral_follow_up);
      let x = r && r.fields &&
        r.fields.t_danger_signs_referral_follow_up === 'yes';
      //console.log('a', x, c.contact.name);
      return x && isAlive(c);
    },
    resolvedIf: function (c, r, event, dueDate) {
      //(refused or migrated) and clear tasks 
      if (isPregnancyTaskMuted(c)) return true;

      let x = isFormArraySubmittedInWindow(c.reports, ['pregnancy_danger_sign_follow_up'],
        Math.max(addDays(dueDate, -event.start).getTime(), r.reported_date + 1),//+1 so that source ds_follow_up does not resolve itself
        addDays(dueDate, event.end + 1).getTime());
      //need to check if visited?
      //console.log('resolved by danger sign follow up report', x);
      return x;
    },
    actions: [
      {
        type: "report",
        form: "pregnancy_danger_sign_follow_up",
        //label: "Pregnancy follow up",
        modifyContent: function (content, c, r) {
          content.source = 'task';
          content.source_id = r._id;
          content.contact = c.contact;
          content.pregnancy_uuid = r._id;
          //content.lmp_date_8601 = r.fields.lmp_date_8601;
          //content.edd_8601 = r.fields.edd_8601;
          //content.weeks_since_lmp = r.fields.weeks_since_lmp;
        }
      }
    ],
    events: [
      {
        id: "pregnancy-danger-sign-follow-up",
        start: 3,
        end: 7,
        dueDate: function (e, c, r) {
          //console.log('r1', r);
          return getDateISOLocal(r.fields.t_danger_signs_referral_follow_up_date);
        }
      }
    ]
  },

  {
    icon: "icon-mother-child",
    title: "task.anc.delivery.title",
    appliesTo: "reports",
    appliesToType: ["pregnancy"],
    appliesIf: function (c, r) {
      //let x = isActivePregnancy(c, r);
      const x = getMostRecentLMPDateForPregnancy(c, r); //only for known LMP
      const y = addDays(x, 337) >= today;
      //console.log('applies ap', x, y, isAlive(c));
      return x && y && isAlive(c);
    },
    resolvedIf: function (c, r, event, dueDate) {
      //miscarriage or abortion
      if (getRecentANCVisitWithEvent(c, r, 'abortion') || getRecentANCVisitWithEvent(c, r, 'miscarriage')) return true;

      //(refused or migrated) and clear tasks 
      if (isPregnancyTaskMuted(c)) return true;
      let x = isFormArraySubmittedInWindow(c.reports, ['delivery'],
        Math.max(addDays(dueDate, -event.start).getTime(), r.reported_date),
        addDays(dueDate, event.end + 1).getTime());

      //console.log('resolved by delivery report', x);
      return x;
    },
    actions: [
      {
        type: "report",
        form: "delivery",
        //label: "Delivery",
        modifyContent: function (content, c, r) {
          content.source = 'task';
          content.source_id = r._id;
          content.contact = c.contact;
          content.pregnancy_uuid = r._id;
          //content.lmp_date_8601 = r.fields.lmp_date_8601;
          //content.edd_8601 = r.fields.edd_8601;
          //content.weeks_since_lmp = r.fields.weeks_since_lmp;
        }
      }
    ],
    events: [
      {
        id: "delivery-reminder",
        start: 28, //due - 4 weeks 
        end: 42, //due + 6 weeks
        dueDate: function (e, c, r) {
          //console.log('r1', addDays(getMostRecentLMPDateForPregnancy(c, r), 294));
          return addDays(getMostRecentLMPDateForPregnancy(c, r), 294); //LMP + 42 weeks
        }
      }
    ]
  },

  {
    icon: "icon-follow-up",
    title: "task.pnc.danger_sign_followup_mother.title",
    appliesTo: "reports",
    appliesToType: ["delivery", "pnc_danger_sign_follow_up_mother"],
    appliesIf: function (c, r) {
      //console.log(r.fields.t_danger_signs_referral_follow_up);
      let x = r && r.fields &&
        r.fields.t_danger_signs_referral_follow_up === 'yes';
      //console.log('a', x, c.contact.name);
      return x && isAlive(c);
    },
    resolvedIf: function (c, r, event, dueDate) {
      //(refused or migrated) and clear tasks 
      if (isPregnancyTaskMuted(c)) return true;

      let x = isFormArraySubmittedInWindow(c.reports, ['pnc_danger_sign_follow_up_mother'],
        Math.max(addDays(dueDate, -event.start).getTime(), r.reported_date + 1),//+1 so that source ds_follow_up does not resolve itself
        addDays(dueDate, event.end + 1).getTime());
      //need to check if visited?
      //console.log('resolved by danger sign follow up report', x);
      return x;
    },
    actions: [
      {
        type: "report",
        form: "pnc_danger_sign_follow_up_mother",
        //label: "Pregnancy follow up",
        modifyContent: function (content, c, r) {
          content.source = 'task';
          content.source_id = r._id;
          content.contact = c.contact;
          content.pregnancy_uuid = r._id;
        }
      }
    ],
    events: [
      {
        id: "pnc-danger-sign-follow-up-mother",
        start: 3,
        end: 7,
        dueDate: function (e, c, r) {
          //console.log('r1', r);
          return getDateISOLocal(r.fields.t_danger_signs_referral_follow_up_date);
        }
      }
    ]
  },

  {
    icon: "icon-follow-up",
    title: "task.pnc.danger_sign_followup_baby.title",
    appliesTo: "contacts",
    appliesToType: ["person"],
    appliesIf: function (c) {
      let x = c && c.contact &&
        c.contact.t_danger_signs_referral_follow_up === 'yes';
      return x && isAlive(c);
    },
    resolvedIf: function (c, r, event, dueDate) {
      let x = isFormArraySubmittedInWindow(c.reports, ['pnc_danger_sign_follow_up_baby'],
        Math.max(addDays(dueDate, -event.start).getTime(), c.contact.reported_date),
        addDays(dueDate, event.end).getTime());
      return x;
    },
    actions: [
      {
        type: "report",
        form: "pnc_danger_sign_follow_up_baby",
        modifyContent: function (content, c) {
          content.source = 'task';
          content.source_id = c._id;
          content.contact = c.contact;
        }
      }
    ],
    events: [
      {
        id: "pnc-danger-sign-follow-up-baby",
        start: 3,
        end: 7,
        dueDate: function (e, c) {
          return getDateISOLocal(c.contact.t_danger_signs_referral_follow_up_date);
        }
      }
    ]
  },
  {
    icon: "icon-follow-up",
    title: "task.pnc.danger_sign_followup_baby.title",
    appliesTo: "reports",
    appliesToType: ["pnc_danger_sign_follow_up_baby"],
    appliesIf: function (c, r) {
      //console.log(r.fields.t_danger_signs_referral_follow_up);
      let x = r && r.fields &&
        r.fields.t_danger_signs_referral_follow_up === 'yes';
      //console.log('a', x, c.contact.name);
      return x && isAlive(c);
    },
    resolvedIf: function (c, r, event, dueDate) {
      //(refused or migrated) and clear tasks 
      if (isPregnancyTaskMuted(c)) return true;

      let x = isFormArraySubmittedInWindow(c.reports, ['pnc_danger_sign_follow_up_baby'],
        Math.max(addDays(dueDate, -event.start).getTime(), r.reported_date + 1),//+1 so that source ds_follow_up does not resolve itself
        addDays(dueDate, event.end + 1).getTime());
      //need to check if visited?
      //console.log('resolved by danger sign follow up report', x);
      return x;
    },
    actions: [
      {
        type: "report",
        form: "pnc_danger_sign_follow_up_baby",
        //label: "Pregnancy follow up",
        modifyContent: function (content, c, r) {
          content.source = 'task';
          content.source_id = r._id;
          content.contact = c.contact;
          content.pregnancy_uuid = r._id;
        }
      }
    ],
    events: [
      {
        id: "pnc-danger-sign-follow-up-baby",
        start: 3,
        end: 7,
        dueDate: function (e, c, r) {
          //console.log('r1', r);
          return getDateISOLocal(r.fields.t_danger_signs_referral_follow_up_date);
        }
      }
    ]
  }
];
