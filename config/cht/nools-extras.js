//const moment = require('moment');
const today = getDateMS(Date.now());
const MS_IN_DAY = 24 * 60 * 60 * 1000;  // 1 day in ms
const MAX_DAYS_IN_PREGNANCY = 44 * 7;  // 44 weeks
const pregnancyForms = ['pregnancy'];

const antenatalForms = ['pregnancy_home_visit'];
const allANCForms = ['pregnancy', 'pregnancy_home_visit', 'pregnancy_facility_visit_reminder',
  'pregnancy_danger_sign', 'pregnancy_danger_sign_follow_up', 'delivery'];

//const deliveryForms = ['delivery'];
function isAlive(c) {
  return c && c.contact && !c.contact.date_of_death;
}

function isFormArraySubmittedInWindow(reports, formArray, start, end, count) {
  let found = false;
  let reportCount = 0;
  reports.forEach(function (report) {
    if (formArray.indexOf(report.form) >= 0) {
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
    if (formArray.indexOf(report.form) >= 0) {
      if (report.reported_date >= start && report.reported_date <= end && report._id !== exReport._id) {
        found = true;
        if (count) {
          reportCount++;
        }
      }
    }
  });
  if (count) { return reportCount >= count; }
  else { return found; }
}


function getMostRecentReport(reports, form) {
  let result = null;
  reports.forEach(function (r) {
    if (form.indexOf(r.form) >= 0 &&
      !r.deleted &&
      (!result || r.reported_date > result.reported_date)) {
      result = r;
    }
  });
  return result;
}

function isOnSameMonth(date1, date2) {
  const firstDate = new Date(date1);
  const secondDate = new Date(date2);
  return date1 && date2 &&
    firstDate.getFullYear() === secondDate.getFullYear() &&
    firstDate.getMonth() === secondDate.getMonth();
}

function getNewestPregnancyTimestamp(c) {
  if (!c.contact) return;
  const newestPregnancy = getMostRecentReport(c.reports, 'pregnancy');
  return newestPregnancy ? newestPregnancy.reported_date : 0;
}

function getNewestDeliveryTimestamp(c) {
  if (!c.contact) return;
  const newestDelivery = getMostRecentReport(c.reports, 'delivery');
  return newestDelivery ? newestDelivery.reported_date : 0;
}

function isFacilityDelivery(c, r) {
  if (!c) {
    return false;
  }
  if (arguments.length === 1) r = c;
  return r && r.fields &&
    r.fields.facility_delivery &&
    r.fields.facility_delivery === 'yes';
}

function countReportsSubmittedInWindow(reports, form, start, end, condition) {
  let reportsFound = 0;
  reports.forEach(function (r) {
    if (form.indexOf(r.form) >= 0) {
      if (r.reported_date >= start && r.reported_date <= end) {
        if (!condition || condition(r)) {
          reportsFound++;
        }
      }
    }
  });
  return reportsFound;
}

function getReportsSubmittedInWindow(reports, form, start, end, condition) {
  const reportsFound = [];
  reports.forEach(function (r) {
    if (form.indexOf(r.form) >= 0) {
      if (r.reported_date >= start && r.reported_date <= end) {
        if (!condition || condition(r)) {
          reportsFound.push(r);
        }
      }
    }
  });
  return reportsFound;
}


function getDateISOLocal(s) {
  if (!s) return new Date();
  const b = s.split(/\D/);
  const d = new Date(b[0], b[1] - 1, b[2]);
  if (isValidDate(d)) return d;
  return new Date();
}

function getDateMS(d) {
  if (typeof d === "string") {
    d = getDateISOLocal(d);
  }
  return getTimeForMidnight(d).getTime();
}

function getTimeForMidnight(d) {
  const date = new Date(d);
  date.setHours(0);
  date.setMinutes(0);
  date.setSeconds(0);
  date.setMilliseconds(0);
  return date;
}

function isValidDate(d) {
  return d instanceof Date && !isNaN(d);
}

function addDays(date, days) {
  const result = getTimeForMidnight(new Date(date));
  result.setDate(result.getDate() + days);
  return result;
}

function isPregnancyForm(r) {
  return pregnancyForms.indexOf(r.form) > -1;
}

function isPregnancyFollowUpForm(r) {
  return antenatalForms.indexOf(r.form) > -1;
}


const getNewestReport = function (reports, forms) {
  let result = null;
  reports.forEach(function (report) {
    if (forms.indexOf(report.form) < 0) { return; }
    if (!result || report.reported_date > result.reported_date) {
      result = report;
    }
  });
  return result;
};

const getLMPDateFromPregnancy = function (r) {
  if (isPregnancyForm(r)) {
    if (r.fields && r.fields.lmp_date_8601) {
      return getDateMS(r.fields.lmp_date_8601);
    }
  }
  return null;
};

const getLMPDateFromPregnancyFollowUp = function (r) {
  if (isPregnancyFollowUpForm(r)) {
    if (r.fields && r.fields.lmp_date_8601) {
      return getDateMS(r.fields.lmp_date_8601);
    }
  }
  return null;
};



function getSubsequentPregnancies(c, report) {
  return c.reports.filter(function (r) {
    return isPregnancyForm(r) && r.reported_date > report.reported_date;
  });
}

function getSubsequentPregnancyFollowUps(c, r) {
  const subsequentVisits = c.reports.filter(function (v) {
    let lmpDate = getLMPDateFromPregnancy(r);
    if (lmpDate === null) { //LMP Date is not available use reported date
      lmpDate = r.reported_date;
    }

    return isPregnancyFollowUpForm(v) &&
      v.reported_date > r.reported_date &&
      v.reported_date < addDays(lmpDate, MAX_DAYS_IN_PREGNANCY);
  });
  return subsequentVisits;
}

function getSubsequentDeliveries(c, report, withinLastXDays) {
  return c.reports.filter(function (r) {
    return (r.form === 'delivery') &&
      r.reported_date > report.reported_date &&
      (!withinLastXDays || report.reported_date >= (today - withinLastXDays * MS_IN_DAY));
  });
}

function getMostRecentLMPDateForPregnancy(c, r) {
  let mostRecentLMP = getLMPDateFromPregnancy(r);
  let mostRecentReportDate = r.reported_date;
  getSubsequentPregnancyFollowUps(c, r).forEach(function (v) {
    const lmpFromPregnancyFollowUp = getLMPDateFromPregnancyFollowUp(v);
    if (v.reported_date > mostRecentReportDate && lmpFromPregnancyFollowUp !== '' && lmpFromPregnancyFollowUp !== mostRecentLMP) {
      mostRecentReportDate = v.reported_date;
      mostRecentLMP = lmpFromPregnancyFollowUp;
    }
  });
  return mostRecentLMP;
}


function isPregnancyTerminatedByAbortion(c, r) {
  const followUps = getSubsequentPregnancyFollowUps(c, r);
  const latestFollowup = getNewestReport(followUps, antenatalForms);
  return latestFollowup &&
    latestFollowup.fields.pregnancy_summary &&
    latestFollowup.fields.pregnancy_summary.visit_option === 'abortion';
}

function isPregnancyTerminatedByMiscarriage(c, r) {
  const followUps = getSubsequentPregnancyFollowUps(c, r);
  const latestFollowup = getNewestReport(followUps, antenatalForms);
  return latestFollowup &&
    latestFollowup.fields.pregnancy_summary &&
    latestFollowup.fields.pregnancy_summary.visit_option === 'miscarriage';
}

function isActivePregnancy(c, r) {
  if (!isPregnancyForm(r)) return false;
  const lmpDate = getMostRecentLMPDateForPregnancy(c, r);
  return lmpDate > today - 294 * MS_IN_DAY && //Pregnancy registration in the past 9 months
    !getSubsequentDeliveries(c, r, 6 * 7).length && //pregnancy not terminated by delivery in last 6 weeks
    !getSubsequentPregnancies(c, r).length &&//pregnancy not terminated by another pregnancy report
    !isPregnancyTerminatedByAbortion(c, r) &&//pregnancy not terminated by miscarriage or abortion
    !isPregnancyTerminatedByMiscarriage(c, r);
}

function countANCFacilityVisits(contact, pregnancy) {
  //from pregnancy report: How many times has ${patient_short_name} been to the health facility for ANC? [anc_visits_hf/anc_visits_hf_past/visited_hf_count]
  //from pregnancy visit report:
  //Did the woman complete the health facility ANC visit scheduled for ${pregnancy_follow_up_date_recent}? [anc_visits_hf/anc_visits_hf_past/last_visit_attended]
  //Would you like to report any additional unreported health facility ANC visits? [anc_visits_hf/anc_visits_hf_past/report_other_visits]

  //How many? [anc_visits_hf/anc_visits_hf_past/visited_hf_count]
  let ancHFVisits = 0;
  const pregnancyFollowUps = getSubsequentPregnancyFollowUps(contact, pregnancy);
  if (pregnancy.fields && pregnancy.fields.anc_visits_hf && pregnancy.fields.anc_visits_hf.anc_visits_hf_past) {
    ancHFVisits += parseInt(pregnancy.fields.anc_visits_hf.anc_visits_hf_past.visited_hf_count);
  }
  pregnancyFollowUps.forEach(function (report) {
    if (report.fields && report.fields.anc_visits_hf && report.fields.anc_visits_hf.anc_visits_hf_past) {
      const pastANCHFVisits = report.fields.anc_visits_hf.anc_visits_hf_past;
      if (pastANCHFVisits.last_visit_attended === 'yes') {
        ancHFVisits += 1;
      }
      if (pastANCHFVisits.report_other_visits === 'yes') {
        ancHFVisits += parseInt(pastANCHFVisits.visited_hf_count);
      }
    }
  });
  return ancHFVisits;
}

function getRecentANCVisitWithEvent(c, r, event) { //miscarriage, abortion, refused, migrated
  const followUps = getSubsequentPregnancyFollowUps(c, r);
  const latestFollowup = getNewestReport(followUps, antenatalForms);
  if (latestFollowup && latestFollowup.fields.pregnancy_summary &&
    latestFollowup.fields.pregnancy_summary.visit_option === event) {
    return latestFollowup;
  }
  return null;
}

function isPregnancyTaskMuted(contact) {
  const latestVisit = getNewestReport(contact.reports, allANCForms);
  return latestVisit && isPregnancyFollowUpForm(latestVisit) && latestVisit.fields &&
    latestVisit.fields.pregnancy_ended && latestVisit.fields.pregnancy_ended.clear_option === 'clear_all';
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
  isOnSameMonth,
  getDateMS,
  getDateISOLocal,
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
  isPregnancyTaskMuted
};