//const moment = require('moment');
const today = getDateMS(Date.now());
const MS_IN_DAY = 24 * 60 * 60 * 1000;
const MAX_DAYS_IN_PREGNANCY = 42 * 7;  // 42 weeks = 294 days
const pregnancyForms = ['pregnancy'];
const deliveryForms = ['delivery'];
const antenatalForms = ['pregnancy_home_visit'];
const allANCForms = ['pregnancy', 'pregnancy_home_visit', 'pregnancy_facility_visit_reminder',
  'pregnancy_danger_sign', 'pregnancy_danger_sign_follow_up', 'delivery'];

function isAlive(contact) {
  return contact && contact.contact && !contact.contact.date_of_death;
}

const getField = (report, fieldPath) => ['fields', ...(fieldPath || '').split('.')]
  .reduce((prev, fieldName) => {
    if (prev === undefined) { return undefined; }
    return prev[fieldName];
  }, report);

function isFormArraySubmittedInWindow(reports, formArray, start, end, count) {
  let found = false;
  let reportCount = 0;
  reports.forEach(function (report) {
    if (formArray.includes(report.form)) {
      if (report.reported_date >= start && report.reported_date <= end) {
        found = true;
        if (count) {
          reportCount++;
        }
      }
    }
  });

  if (count) { return reportCount >= count; }
  return found;
}


function isFormArraySubmittedInWindowExcludingThisReport(reports, formArray, start, end, exReport, count) {
  let found = false;
  let reportCount = 0;
  reports.forEach(function (report) {
    if (formArray.includes(report.form)) {
      if (report.reported_date >= start && report.reported_date <= end && report._id !== exReport._id) {
        found = true;
        if (count) {
          reportCount++;
        }
      }
    }
  });
  if (count) {
    return reportCount >= count;
  }
  return found;
}


function getMostRecentReport(reports, form) {
  let result;
  reports.forEach(function (report) {
    if (form.includes(report.form) &&
      !report.deleted &&
      (!result || report.reported_date > result.reported_date)) {
      result = report;
    }
  });
  return result;
}

function getNewestPregnancyTimestamp(contact) {
  if (!contact.contact) { return; }
  const newestPregnancy = getMostRecentReport(contact.reports, 'pregnancy');
  return newestPregnancy ? newestPregnancy.reported_date : 0;
}

function getNewestDeliveryTimestamp(contact) {
  if (!contact.contact) { return; }
  const newestDelivery = getMostRecentReport(contact.reports, 'delivery');
  return newestDelivery ? newestDelivery.reported_date : 0;
}

function isFacilityDelivery(contact, report) {
  if (!contact) {
    return false;
  }
  if (arguments.length === 1) { report = contact; }
  return getField(report, 'facility_delivery') === 'yes';
}

function countReportsSubmittedInWindow(reports, form, start, end, condition) {
  let reportsFound = 0;
  reports.forEach(function (report) {
    if (form.includes(report.form)) {
      if (report.reported_date >= start && report.reported_date <= end) {
        if (!condition || condition(report)) {
          reportsFound++;
        }
      }
    }
  });
  return reportsFound;
}

function getReportsSubmittedInWindow(reports, form, start, end, condition) {
  const reportsFound = [];
  reports.forEach(function (report) {
    if (form.includes(report.form)) {
      if (report.reported_date >= start && report.reported_date <= end) {
        if (!condition || condition(report)) {
          reportsFound.push(report);
        }
      }
    }
  });
  return reportsFound;
}


function getDateISOLocal(s) {
  if (!s) { return new Date(); }
  const b = s.split(/\D/);
  const d = new Date(b[0], b[1] - 1, b[2]);
  if (isValidDate(d)) { return d; }
  return new Date();
}

function getTimeForMidnight(d) {
  const date = new Date(d);
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

function getDateMS(d) {
  if (typeof d === 'string') {
    if (d === '') { return null; }
    d = getDateISOLocal(d);
  }
  return getTimeForMidnight(d).getTime();
}

function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

function addDays(date, days) {
  const result = getTimeForMidnight(new Date(date));
  result.setDate(result.getDate() + days);
  return result;
}

function isPregnancyForm(report) {
  return pregnancyForms.includes(report.form);
}

function isPregnancyFollowUpForm(report) {
  return antenatalForms.includes(report.form);
}

function isDeliveryForm(report) {
  return deliveryForms.includes(report.form);
}

const getNewestReport = function (reports, forms) {
  let result;
  reports.forEach(function (report) {
    if (!forms.includes(report.form)) { return; }
    if (!result || report.reported_date > result.reported_date) {
      result = report;
    }
  });
  return result;
};

const getLMPDateFromPregnancy = function (report) {
  return isPregnancyForm(report) &&
    getDateMS(getField(report, 'lmp_date_8601'));
};

const getLMPDateFromPregnancyFollowUp = function (report) {
  return isPregnancyFollowUpForm(report) &&
    getDateMS(getField(report, 'lmp_date_8601'));
};



function getSubsequentPregnancies(contact, refReport) {
  return contact.reports.filter(function (report) {
    return isPregnancyForm(report) && report.reported_date > refReport.reported_date;
  });
}

function getSubsequentPregnancyFollowUps(contact, report) {
  const subsequentVisits = contact.reports.filter(function (visit) {
    let lmpDate = getLMPDateFromPregnancy(report);
    if (!lmpDate) { //LMP Date is not available, use reported date
      lmpDate = report.reported_date;
    }

    return isPregnancyFollowUpForm(visit) &&
      visit.reported_date > report.reported_date &&
      visit.reported_date < addDays(lmpDate, MAX_DAYS_IN_PREGNANCY);
  });
  return subsequentVisits;
}

function getSubsequentDeliveries(contact, refReport, withinLastXDays) {
  return contact.reports.filter(function (deliveryReport) {
    return (deliveryReport.form === 'delivery') &&
      deliveryReport.reported_date > refReport.reported_date &&
      (!withinLastXDays || refReport.reported_date >= (today - withinLastXDays * MS_IN_DAY));
  });
}

function getMostRecentLMPDateForPregnancy(contact, report) {
  let mostRecentLMP = getLMPDateFromPregnancy(report);
  let mostRecentReportDate = report.reported_date;
  getSubsequentPregnancyFollowUps(contact, report).forEach(function (v) {
    const lmpFromPregnancyFollowUp = getLMPDateFromPregnancyFollowUp(v);
    if (v.reported_date > mostRecentReportDate && lmpFromPregnancyFollowUp !== '' && lmpFromPregnancyFollowUp !== mostRecentLMP) {
      mostRecentReportDate = v.reported_date;
      mostRecentLMP = lmpFromPregnancyFollowUp;
    }
  });
  return mostRecentLMP;
}


function isPregnancyTerminatedByAbortion(contact, report) {
  const followUps = getSubsequentPregnancyFollowUps(contact, report);
  const latestFollowup = getNewestReport(followUps, antenatalForms);
  return latestFollowup && getField(latestFollowup, 'pregnancy_summary.visit_option') === 'abortion';
}

function isPregnancyTerminatedByMiscarriage(contact, report) {
  const followUps = getSubsequentPregnancyFollowUps(contact, report);
  const latestFollowup = getNewestReport(followUps, antenatalForms);
  return latestFollowup && getField(latestFollowup, 'pregnancy_summary.visit_option') === 'miscarriage';
}

function isActivePregnancy(contact, report) {
  if (!isPregnancyForm(report)) { return false; }
  const lmpDate = getMostRecentLMPDateForPregnancy(contact, report) || report.reported_date;
  const isPregnancyRegisteredWithin9Months = lmpDate > today - MAX_DAYS_IN_PREGNANCY * MS_IN_DAY;
  const isPregnancyTerminatedByDeliveryInLast6Weeks = getSubsequentDeliveries(contact, report, 6 * 7).length > 0;
  const isPregnancyTerminatedByAnotherPregnancyReport = getSubsequentPregnancies(contact, report).length > 0;
  return isPregnancyRegisteredWithin9Months &&
    !isPregnancyTerminatedByDeliveryInLast6Weeks &&
    !isPregnancyTerminatedByAnotherPregnancyReport &&
    !isPregnancyTerminatedByAbortion(contact, report) &&
    !isPregnancyTerminatedByMiscarriage(contact, report);
}

function countANCFacilityVisits(contact, pregnancyReport) {
  let ancHFVisits = 0;
  const pregnancyFollowUps = getSubsequentPregnancyFollowUps(contact, pregnancyReport);
  if (getField(pregnancyReport, 'anc_visits_hf.anc_visits_hf_past') && !isNaN(getField(pregnancyReport, 'anc_visits_hf.anc_visits_hf_past.visited_hf_count'))) {
    ancHFVisits += parseInt(getField(pregnancyReport, 'anc_visits_hf.anc_visits_hf_past.visited_hf_count'));
  }
  ancHFVisits += pregnancyFollowUps.reduce(function (sum, report) {
    const pastANCHFVisits = getField(report, 'anc_visits_hf.anc_visits_hf_past');
    if (!pastANCHFVisits) { return 0; }
    sum += pastANCHFVisits.last_visit_attended === 'yes' && 1;
    if (isNaN(pastANCHFVisits.visited_hf_count)) { return sum; }
    return sum += pastANCHFVisits.report_other_visits === 'yes' && parseInt(pastANCHFVisits.visited_hf_count);
  },
  0);
  return ancHFVisits;
}

function getRecentANCVisitWithEvent(contact, report, event) {
  //event should be one among miscarriage, abortion, refused, migrated
  const followUps = getSubsequentPregnancyFollowUps(contact, report);
  const latestFollowup = getNewestReport(followUps, antenatalForms);
  if (latestFollowup && getField(latestFollowup, 'pregnancy_summary.visit_option') === event) {
    return latestFollowup;
  }
}

function isPregnancyTaskMuted(contact) {
  const latestVisit = getNewestReport(contact.reports, allANCForms);
  return latestVisit && isPregnancyFollowUpForm(latestVisit) &&
    getField(latestVisit, 'pregnancy_ended.clear_option') === 'clear_all';
}


/**
 * Calculates the dynamic priority score for a Community Health Worker (CHW) task
 * @param {string} taskType - The type of task from the predefined list
 * @param {Array<string>} riskFactors - Array of risk factors present for the individual
 * @returns {number} - The calculated priority score (higher = more urgent)
 */
function calculatePriorityScore(taskType, riskFactors = []) {
  // Task type weights
  const taskWeights = {
    'Emergency Follow-up: Pregnancy': 10,
    'Emergency Follow-up: Postpartum': 10,
    'Emergency Follow-up: Child <1 month': 10,
    'Emergency Follow-up: Child <1 year': 9,
    'Follow-up: Red MUAC': 9,
    'Follow-up: 2 Consecutive Yellow MUAC Readings': 8,
    'Follow-up: Pregnancy Outcome after EDD': 8,
    'Routine PNC Visit (within 48 hours, day 3-7)': 8,
    'Routine Newborn Visit (within 48 hours, 3-7 days and 3-9 days)': 7,
    'Follow-up on Missed Vaccination AND vaccination defaulters': 7,
    'Routine ANC Visit (based on gestational age)': 8,
    'Follow-up on Pregnancy Danger Signs (not emergency)': 5,
    'Routine Visit for Child Under 6 months': 6,
    'Routine visit for Children under three years': 6,
    'Chronic Disease Monitoring': 5,
    'Mental Health Referral Follow-up': 5,
    'Follow-up on TB Treatment Adherence': 5,
    'Routine Visit for Elderly/Chronic Conditions': 5,
    'Community Monthly Meeting': 4,
    'Update Missing Information': 3,
    'Routine Household Visit': 2,
    'Meeting with CHW Supervisor and peers': 4,
    'Conduct Health Campaign': 0, 
    'Follow-up on Non-Emergency Referral': 4
  };

  // Risk factor weights
  const riskWeights = {
    'Known chronic condition and medication defaulter': 2,
    'Known immunization defaulter': 2,
    'Previously referred (any reason)': 1,
    'Known previous danger signs in pregnancy or delivery': 3,
    'Known condition - LBW baby, complication during delivery': 3,
    'Pregnant and <20 years': 2,
    'Pregnant and >35 years': 2,
    'Multiparous (>4 children)': 1,
    'Child with disability or chronic illness': 2,
    'Malnutrition history (2 yellow or red MUAC)': 2
  };

  // Get base task weight
  let score = taskWeights[taskType] || 0;

  // Add risk factor weights
  riskFactors.forEach(factor => {
    if (riskWeights[factor]) {
      score += riskWeights[factor];
    }
  });

  // Ensure score doesn't exceed maximum (10)
  return Math.min(score, 10);
}

module.exports = {
  today,
  MS_IN_DAY,
  MAX_DAYS_IN_PREGNANCY,
  addDays,
  isAlive,
  getTimeForMidnight,
  isFormArraySubmittedInWindow,
  isFormArraySubmittedInWindowExcludingThisReport,
  getDateMS,
  getDateISOLocal,
  isDeliveryForm,
  getMostRecentReport,
  getNewestPregnancyTimestamp,
  getNewestDeliveryTimestamp,
  getReportsSubmittedInWindow,
  countReportsSubmittedInWindow,
  countANCFacilityVisits,
  isFacilityDelivery,
  getMostRecentLMPDateForPregnancy,
  getNewestReport,
  getSubsequentPregnancyFollowUps,
  isActivePregnancy,
  getRecentANCVisitWithEvent,
  isPregnancyTaskMuted,
  getField,
  calculatePriorityScore
};
