const extras = require('./nools-extras');

const {
  MAX_DAYS_IN_PREGNANCY,
  today,
  getNewestPregnancyTimestamp,
  getNewestDeliveryTimestamp,
  isAlive,
  isFormArraySubmittedInWindow,
  isFormArraySubmittedInWindowExcludingThisReport,
  isFormArraySubmittedInWindowAfterThisReport,
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

// todo - verify events.ID nomenclature
module.exports = [

  // MNCH Immunization and Growth follow up 3 days
  {
    name: 'immunization_growth_follow_up_missed_vaccine_date_3',
    icon: 'icon-people-children',
    title: 'Immunization Growth Follow Up',
    appliesTo: 'reports',
    appliesToType: ['immunization_and_growth'],
    actions: [{type: 'report',form: 'immunization_and_growth'}],
    appliesIf: function(contact, report) {
      // Trigger a immunization follow up form 3 days from the selected date
      return parseInt(getField(report, 'g_missed_vaccine_details.missed_vaccine_date'))  > 0;
    },
    events: [
      {
        id: 'immunization_growth_follow_up_is_set_missed_vaccine_date_3',
        dueDate: function (event, contact, report) {
          return getDateISOLocal(getField(report, 'g_missed_vaccine_details.missed_vaccine_date'));
        },
        start: 3, end: 3
      }
    ],
    resolvedIf: function(contact, report, event, dueDate) {
      return isFormArraySubmittedInWindow(
        contact.reports,
        ['immunization_and_growth'],
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
    actions: [{type: 'report',form: 'immunization_and_growth'}],
    appliesIf: function(contact, report) {
      // Trigger a immunization follow up form 3 days from the selected date
      // todo - remove this debug
      console.log('g_deworming.deworm_next_date', getField(report, 'g_deworming.deworm_next_date'));
      return parseInt(getField(report, 'g_deworming.deworm_next_date'))  > 0;
    },
    events: [
      {
        id: 'immunization_growth_follow_up_is_set_deworm_next_date_3',
        dueDate: function (event, contact, report) {
          return getDateISOLocal(getField(report, 'g_deworming.deworm_next_date'));
        },
        start: 3, end: 3
      }
    ],
    resolvedIf: function(contact, report, event, dueDate) {
      return isFormArraySubmittedInWindow(
        contact.reports,
        ['immunization_and_growth'],
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
    actions: [{type: 'report',form: 'immunization_and_growth'}],
    appliesIf: function(contact, report) {
      // Trigger a immunization follow up form 3 days from the selected date
      // todo - remove this debug
      if (parseInt(getField(report, 'g_next_appointment.next_appointment_date'))  > 0){
        console.log('YES patient_id', getField(report, 'patient_id' ));
        console.log('YES g_next_appointment.next_appointment_date', getField(report, 'g_next_appointment.next_appointment_date'));
        return true;
      } else {
        console.log('NO g_next_appointment.next_appointment_date', getField(report, 'g_next_appointment.next_appointment_date'));
        return false;
      }
    },
    events: [
      {
        id: 'immunization_growth_follow_up_is_set_next_appointment_date_3',
        dueDate: function (event, contact, report) {
          return getDateISOLocal(getField(report, 'g_next_appointment.next_appointment_date'));
        },
        start: 31, end: 30
      }
    ],
    resolvedIf: function(contact, report, event, dueDate) {
      return isFormArraySubmittedInWindowExcludingThisReport(
        contact.reports,
        ['immunization_and_growth'],
        Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date),
        addDays(dueDate, event.end + 1).getTime(),
        report
      );
    }
  },

  // MNCH Immunization and Growth child_development_follow_up - developmental_milestones 7 days
  {
    name: 'immunization_growth_follow_up_developmental_milestones',
    icon: 'icon-child-growth',
    title: 'Child Development Follow Up',
    appliesTo: 'reports',
    appliesToType: ['immunization_and_growth'],
    actions: [{type: 'report',form: 'child_development_follow_up'}],
    appliesIf: function(contact, report) {
      // Trigger a child development referral follow up task 7days from the  selected date. The task should stay for 3 more days
      return parseInt(getField(report, 'g_developmental_milestones.developmental_next_assignment_date'))  > 0;
    },
    events: [
      {
        id: 'immunization_growth_follow_up_is_set_developmental_milestones_7',
        dueDate: function (event, contact, report) {
          return getDateISOLocal(getField(report, 'g_developmental_milestones.developmental_apt_date'));
        },
        start: 3, end: 3
      }
    ],
    resolvedIf: function(contact, report, event, dueDate) {
      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date);
      const endTime = addDays(dueDate, event.end + 1).getTime();
      return isFormArraySubmittedInWindow(
        contact.reports, ['child_development_follow_up'], startTime, endTime
      );
    }
  },

  // MNCH Immunization and Growth follow up child_referral_follow_up 1 day
  {
    name: 'immunization_growth_any_danger',
    icon: 'icon-followup-general',
    title: 'Child referral follow up',
    appliesTo: 'reports',
    appliesToType: ['immunization_and_growth'],
    actions: [{type: 'report',form: 'child_referral_follow_up'}],
    appliesIf: function(contact, report) {
      // If any danger sign marked triggers an "Child referral follow up" form that shows up the next day of the reported day
      return getField(report, 'any_danger') === 'yes';
    },
    events: [
      {
        id: 'immunization_growth_any_danger',
        days: 1, start: 1, end: 3
      }
    ],
    resolvedIf: function(contact, report, event, dueDate) {
      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date);
      const endTime = addDays(dueDate, event.end + 1).getTime();
      return isFormArraySubmittedInWindow(
        contact.reports, ['child_referral_follow_up'], startTime, endTime
      );
    }
  },

  // // MNCH Child assessment 
  // {
  //   name: 'child_treatment_follow_up_3day',
  // },

  // // MNCH Child assessment 
  // {
  //   name: 'child_treatment_follow_up_3day',
  // },

  // MNCH Child assessment child_referral_follow_up_0day
  {
    name: 'child_referral_follow_up_0day_TEST',
    icon: 'icon-followup-general',
    title: 'Child referral follow up',
    appliesTo: 'reports',
    appliesToType: ['child_assessment'],
    actions: [{type: 'report',form: 'child_assessment'}],
    appliesIf: function(contact, report) {
      if( getField(report, 'any_danger') === 'yes' ) {
        console.log('child_referral_follow_up_0day_TEST task');
        return true;
      } else {
        return false;
      }
    },
    events: [
      {
        id: 'child_referral_follow_up_0day_TEST',
        days: 0, start: 3, end: 3
      }
    ],
    resolvedIf: function(contact, report, event, dueDate) {
      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date);
      const endTime = addDays(dueDate, event.end + 1).getTime();
      return isFormArraySubmittedInWindowAfterThisReport(
        contact.reports, ['child_assessment'], startTime, endTime, report
      );
    }
  },

  // MNCH Child assessment child_referral_follow_up_3day
  {
    name: 'child_referral_follow_up_3day',
    icon: 'icon-followup-general',
    title: 'Child referral follow up',
    appliesTo: 'reports',
    appliesToType: ['child_assessment'],
    actions: [{type: 'report',form: 'child_referral_follow_up'}],
    appliesIf: function(contact, report) {
      if(
        getField(report, 'g_two_mo_assessment.two_mo_referred') === 'yes' ||
        getField(report, 'danger_signs_without_fever') === 'yes' ||
        getField(report, 'g_malaria.malaria_fever_length') >= 7 ||
        getField(report, 'g_malaria.malaria_results') === 'not_done' ||
        getField(report, 'receive_malaria_treatment') === 'yes' ||
        getField(report, 'receive_fever_treatment') === 'yes' ||
        getField(report, 'g_cough.cough_time') >= 14 ||
        getField(report, 'fast_breathing_child') === 'yes' ||
        getField(report, 'fast_breathing_person') === 'yes' ||
        getField(report, 'g_diarrhea.diarrhea_last') >= 14 ||
        getField(report, 'g_diarrhea.diarrhea_blood') === 'yes'  ||
        (
          getField(report, 'g_diarrhea.diarrhea_last') < 14 &&
          getField(report, 'g_diarrhea.diarrhea_blood') === 'no'
        ) ||
        getField(report, 'g_malnutrition.malnutrition_muac_color') === 'red' ||
        getField(report, 'g_malnutrition.malnutrition_muac_color') === 'yellow' ||
        getField(report, 'g_malnutrition.malnutrition_swollen_feet') === 'yes'
      ) {
        // Mark as referral for danger signs of newborns, Go to summary page & end form. Triggers a chi referral
        // follow up that starts in 3 days and stays for 3 days

        // Trigger a child referral follow up that starts in 3 days and stays for 3 days danger_signs_without_fever

        // If fever for 7 days or more--mark it as danger sign  for Urgent Referral.
        // Trigger a child referral follow up that starts in 3 days and stays for 3 days

        // Rapid Malaria Tests Results - if "Not done" - Capture as danger sign for referral
        // Trigger a child referral follow up that starts in 3 days and stays for 3 days

        // Trigger: If fever for less than 7 days AND RDT results-Positive trigger a
        // child treatment follow up that show up in 3 and 6 days. the tasks should stay for 3 days

        // Trigger: If fever for less than 7 days AND RDT-Negative/Not done trigger a child treatment
        // follow up that show up in 3 and 6 days. the tasks should stay for 3 days

        // Have you referred ${patient_name} for malaria test? Refer child to a health facility for malaria test
        // Trigger a child referral follow up that starts in 3 days and stays for 3 days

        // How long has this cough lasted? If 14 days or more---mark it as a danger sign for Urgent Referral
        // Trigger a child referral follow up that starts in 3 days and stays for 3 days

        // How many breaths per minute? if   integer => 50bpm and age is 2 to 12months If yes--mark it as danger
        // sign  for Urgent Referral.
        // if  integer =>40bpm and age is >12months upto 5 years If yes--mark it as danger sign  for Urgent Referral.
        // if integer>24bpm and age is more than 5 years

        // How long has the diarrhea lasted? If  14 days or more--mark it as danger sign  for Urgent Referral
        // Trigger a child referral follow up that starts in 3 days and stays for 3 days

        // Is there blood in the diarrhea? If yes--mark it as danger sign  for Urgent Referral.
        // Trigger a child referral follow up that starts in 3 days and stays for 3 days

        // If diarrhea for less than14 days AND No blood in diarrhea trigger a child treatment follow
        // up that show up in 3 and 6 days. the tasks should stay for 3 days

        // If red MUAC trigger a malnutrition referral follow up that starts in 3 days and stays for 3 days

        // If yellow MUAC trigger a child treatment follow up that show up in 3 and 6 days. the tasks should stay for 3 days

        // Swelling of both feet of the child? If yes--mark it as danger sign  for Urgent Referral.
        // Trigger a child referral follow up that starts in 3 days and stays for 3 days
        console.log('child_referral_follow_up_3day task');
        return true;
      } else {
        return false;
      }
    },
    events: [
      {
        id: 'child_referral_follow_up_3day',
        days: 3, start: 3, end: 3
      }
    ],
    resolvedIf: function(contact, report, event, dueDate) {
      const startTime = Math.max(addDays(dueDate, -event.start).getTime(), report.reported_date);
      const endTime = addDays(dueDate, event.end + 1).getTime();
      return isFormArraySubmittedInWindow(
        contact.reports, ['child_referral_follow_up'], startTime, endTime
      );
    }
  },

  // MNCH Child assessment child_referral_follow_up_6day
  {
    name: 'child_referral_follow_up_6day',
    icon: 'icon-followup-general',
    title: 'Child referral follow up',
    appliesTo: 'reports',
    appliesToType: ['child_assessment'],
    actions: [{type: 'report',form: 'child_referral_follow_up'}],
    appliesIf: function(contact, report) {
      if(
        getField(report, 'receive_malaria_treatment') === 'yes' ||
        getField(report, 'receive_fever_treatment') === 'yes' ||
        getField(report, 'g_cough.cough_time') < 14 ||
        (
          getField(report, 'fast_breathing_person')  === 'yes'  &&
          getField(report, 'g_cough.cough_time')  < 14
        ) ||
        (
          getField(report, 'g_diarrhea.diarrhea_last') < 14 &&
          getField(report, 'g_diarrhea.diarrhea_blood') === 'no'
        ) ||
        getField(report, 'g_malnutrition.malnutrition_muac_color') === 'yellow'
      ) {
        // Trigger: If fever for less than 7 days AND RDT results-Positive trigger a
        // child treatment follow up that show up in 3 and 6 days. the tasks should stay for 3 days

        // Trigger: If fever for less than 7 days AND RDT-Negative/Not done trigger a child treatment
        // follow up that show up in 3 and 6 days. the tasks should stay for 3 days

        // How long has this cough lasted? If cough less than 14 days trigger a child treatment follow up that
        // show up in 3 and 6 days. the tasks should stay for 3 days

        // If cough for less than 14 days AND Fast Breathing trigger a child treatment follow up that show up in 3
        // and 6 days. the tasks should stay for 3 days

        // If diarrhea for less than14 days AND No blood in diarrhea trigger a child treatment follow up that show up
        // in 3 and 6 days. the tasks should stay for 3 days

        // If yellow MUAC trigger a child treatment follow up that show up in 3 and 6 days. the tasks should
        // stay for 3 days
        console.log('child_referral_follow_up_6day task');
        return true;
      } else {
        return false;
      }
    },
    events: [
      {
        id: 'child_referral_follow_up_6day',
        days: 6, start: 3, end: 3 // todo - this doesn't show up in "2 weeks" which I think it should...
      }
    ],
    resolvedIf: function(contact, report, event, dueDate) {
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

