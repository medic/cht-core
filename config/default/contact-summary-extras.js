const moment = require('moment');
const today = moment().startOf('day');

const isReportValid = function (report) {
  if (report.form && report.fields && report.reported_date) { return true; }
  return false;
};

const pregnancyForms = ['pregnancy']; 

const antenatalForms = ['pregnancy_home_visit'];

const deliveryForms = ['delivery'];

const pregnancDangerSignForms = ['pregnancy', 'pregnancy_home_visit', 'pregnancy_danger_sign', 'pregannacy_danger_sign_follow_up'];


const MAX_DAYS_IN_PREGNANCY = 42 * 7;
const AVG_DAYS_IN_PREGNANCY = 280;

const getField = (report, fieldPath) => ['fields', ...(fieldPath || '').split('.')]
  .reduce((prev, fieldName) => {
    if (prev === undefined) { return undefined; }
    return prev[fieldName];
  }, report);

function getFormArraySubmittedInWindow(allReports, formArray, start, end) {
  return allReports.filter(function (report) {
    return formArray.includes(report.form) &&
      report.reported_date >= start && report.reported_date <= end;
  });
}


function getNewestReport(allReports, forms) {
  let result;
  allReports.forEach(function (report) {
    if (!isReportValid(report) || !forms.includes(report.form)) { return; }
    if (!result || report.reported_date > result.reported_date) {
      result = report;
    }
  });
  return result;
}


function getLMPDateFromPregnancy(report) {
  return isPregnancyForm(report) && getField(report, 'lmp_date_8601') && moment(getField(report, 'lmp_date_8601'));
}

function getLMPDateFromPregnancyFollowUp(report) {
  return isPregnancyFollowUpForm(report) && getField(report, 'lmp_date_8601') && moment(getField(report, 'lmp_date_8601'));
}

function getMostRecentLMPDateForPregnancy(allReports, pregnancyReport) {
  let mostRecentLMP = getLMPDateFromPregnancy(pregnancyReport);
  let mostRecentReportDate = pregnancyReport.reported_date;
  getSubsequentPregnancyFollowUps(allReports, pregnancyReport).forEach(function (visit) {
    const lmpFromPregnancyFollowUp = getLMPDateFromPregnancyFollowUp(visit);
    if (visit.reported_date > mostRecentReportDate && getField(visit, 'lmp_updated') === 'yes') {
      mostRecentReportDate = visit.reported_date;
      mostRecentLMP = lmpFromPregnancyFollowUp;
    }
  });
  return mostRecentLMP;
}

function getMostRecentEDDForPregnancy(allReports, report) {
  const lmpDate = getMostRecentLMPDateForPregnancy(allReports, report);
  if (lmpDate) {
    return lmpDate.clone().add(AVG_DAYS_IN_PREGNANCY, 'days');
  }
}

function getDeliveryDate(report) {
  return isDeliveryForm(report) && getField(report, 'delivery_outcome.delivery_date') && moment(getField(report, 'delivery_outcome.delivery_date'));
}

function getNextANCVisitDate(allReports, report) {
  let nextVisit = getField(report, 't_pregnancy_follow_up_date');
  let eddReportDate = report.reported_date;
  const followUps = getSubsequentPregnancyFollowUps(allReports, report);
  followUps.forEach(function (followUpReport) {
    if (followUpReport.reported_date > eddReportDate && !!getField(followUpReport, 't_pregnancy_follow_up_date')) {
      eddReportDate = followUpReport.reported_date;
      nextVisit = getField(followUpReport, 't_pregnancy_follow_up_date');
    }
  });
  return moment(nextVisit);
}


function getDangerSignCodes(report) {
  const dangerSignCodes = [];
  if (getField(report, 't_danger_signs_referral_follow_up') === 'yes') {
    const dangerSignsObj = getField(report, 'danger_signs');
    if (dangerSignsObj) {
      for (const dangerSign in dangerSignsObj) {
        if (dangerSignsObj[dangerSign] === 'yes' && dangerSign !== 'r_danger_sign_present') {
          dangerSignCodes.push(dangerSign);
        }
      }
    }
  }
  return dangerSignCodes;
}

function getLatestDangerSignsForPregnancy(allReports, pregnancy) {
  if (!pregnancy) { return []; }
  let lmpDate = getMostRecentLMPDateForPregnancy(allReports, pregnancy);
  if (!lmpDate) { lmpDate = moment(pregnancy.reported_date); } //If unknown, take preganacy.reported_date
  const allReportsWithDangerSigns = getFormArraySubmittedInWindow(allReports, pregnancDangerSignForms, lmpDate.toDate(), lmpDate.clone().add(MAX_DAYS_IN_PREGNANCY, 'days').toDate());
  const allRelevantReports = [];
  allReportsWithDangerSigns.forEach((report) => {
    if (isPregnancyFollowUpForm(report)) {
      //only push pregnancy home visit report that have actually been visited
      if (getField(report, 'pregnancy_summary.visit_option') === 'yes') {
        allRelevantReports.push(report);
      }
    }
    //for other reports with danger signs, push without checking for visit
    else {
      allRelevantReports.push(report);
    }
  });
  const recentReport = getNewestReport(allRelevantReports, pregnancDangerSignForms);
  if (!recentReport) { return []; }
  return getDangerSignCodes(recentReport);
}


function getRiskFactorsFromPregnancy(report) {
  const riskFactors = [];
  if (!isPregnancyForm(report)) { return []; }
  if (getField(report, 'risk_factors.r_risk_factor_present') === 'yes') {
    if (getField(report, 'risk_factors.risk_factors_history.first_pregnancy') === 'yes') {
      riskFactors.push('first_pregnancy');
    }
    if (getField(report, 'risk_factors.risk_factors_history.previous_miscarriage') === 'yes') {
      riskFactors.push('previous_miscarriage');
    }
    const riskFactorsPrimary = getField(report, 'risk_factors.risk_factors_present.primary_condition');
    const riskFactorsSecondary = getField(report, 'risk_factors.risk_factors_present.secondary_condition');
    if (riskFactorsPrimary) {
      riskFactors.push(...riskFactorsPrimary.split(' '));
    }
    if (riskFactorsSecondary) {
      riskFactors.push(...riskFactorsSecondary.split(' '));
    }
  }
  return riskFactors;
}

function getNewRiskFactorsFromFollowUps(report) {
  const riskFactors = [];
  if (!isPregnancyFollowUpForm(report)) { return []; }
  if (getField(report, 'anc_visits_hf.risk_factors.r_risk_factor_present') === 'yes') {
    const newRiskFactors = getField(report, 'anc_visits_hf.risk_factors.new_risks');
    if (newRiskFactors) {
      riskFactors.push(...newRiskFactors.split(' '));
    }
  }
  return riskFactors;
}

function getAllRiskFactors(allReports, pregnancy) {
  const riskFactorCodes = getRiskFactorsFromPregnancy(pregnancy);
  const pregnancyFollowUps = getSubsequentPregnancyFollowUps(allReports, pregnancy);
  pregnancyFollowUps.forEach(function (visit) {
    riskFactorCodes.push(...getNewRiskFactorsFromFollowUps(visit));
  });
  return riskFactorCodes;
}

function getRiskFactorExtra(report) {
  let extraRisk;
  if (report && isPregnancyForm(report)) {
    extraRisk = getField(report, 'risk_factors.risk_factors_present.additional_risk');
  }
  else if (report && isPregnancyFollowUpForm(report)) {
    extraRisk = getField(report, 'anc_visits_hf.risk_factors.additional_risk');
  }
  return extraRisk;
}

function getAllRiskFactorExtra(allReports, pregnancy) {
  const riskFactorsExtra = [];
  const riskFactorExtraFromPregnancy = getRiskFactorExtra(pregnancy);
  if (riskFactorExtraFromPregnancy) {
    riskFactorsExtra.push(riskFactorExtraFromPregnancy);
  }
  const pregnancyFollowUps = getSubsequentPregnancyFollowUps(allReports, pregnancy);
  pregnancyFollowUps.forEach(function (visit) {
    const riskFactorExtraFromVisit = getRiskFactorExtra(visit);
    if (riskFactorExtraFromVisit) {
      riskFactorsExtra.push(riskFactorExtraFromVisit);
    }
  });
  return riskFactorsExtra;
}

const isHighRiskPregnancy = function (allReports, pregnancy) {
  return getAllRiskFactors(allReports, pregnancy).length ||
    getAllRiskFactorExtra(allReports, pregnancy).length ||
    getDangerSignCodes(pregnancy).length;
};

function isAlive(thisContact) {
  return thisContact && !thisContact.date_of_death;
}

function isPregnancyForm(report) {
  return report && pregnancyForms.includes(report.form);
}

function isPregnancyFollowUpForm(report) {
  return report && antenatalForms.includes(report.form);
}

function isDeliveryForm(report) {
  return report && deliveryForms.includes(report.form);
}

function getSubsequentPregnancies(allReports, refReport) {
  return allReports.filter(function (report) {
    return isPregnancyForm(report) && report.reported_date > refReport.reported_date;
  });
}

function isActivePregnancy(thisContact, allReports, report) {
  if (thisContact.type !== 'person' || !isAlive(thisContact) || !isPregnancyForm(report)) { return false; }
  const lmpDate = getMostRecentLMPDateForPregnancy(allReports, report) || report.reported_date;
  const isPregnancyRegisteredWithin9Months = lmpDate > today.clone().subtract(MAX_DAYS_IN_PREGNANCY, 'day');
  const isPregnancyTerminatedByDeliveryInLast6Weeks = getSubsequentDeliveries(allReports, report, 6 * 7).length > 0;
  const isPregnancyTerminatedByAnotherPregnancyReport = getSubsequentPregnancies(allReports, report).length > 0;
  return isPregnancyRegisteredWithin9Months &&
    !isPregnancyTerminatedByDeliveryInLast6Weeks &&
    !isPregnancyTerminatedByAnotherPregnancyReport &&
    !getRecentANCVisitWithEvent(allReports, report, 'abortion') &&
    !getRecentANCVisitWithEvent(allReports, report, 'miscarriage');
}

function isPregnant(allReports) {
  return allReports.some(report => isActivePregnancy(report));
}

function isReadyForNewPregnancy(thisContact, allReports) {
  if (thisContact.type !== 'person') { return false; }
  const mostRecentPregnancyReport = getNewestReport(allReports, pregnancyForms);
  const mostRecentDeliveryReport = getNewestReport(allReports, deliveryForms);
  if (!mostRecentPregnancyReport && !mostRecentDeliveryReport) {
    return true; //No previous pregnancy or delivery recorded, fresh profile
  }

  else if (!mostRecentPregnancyReport) {
    //Delivery report without pregnancy report
    //Decide on the basis of Delivery report

    if (mostRecentDeliveryReport && getDeliveryDate(mostRecentDeliveryReport) < today.clone().subtract(6 * 7, 'day')) {
      return true; //Delivery date on most recentlty submitted delivery form is more than 6 weeks ago
    }
  }

  else if (!mostRecentDeliveryReport || mostRecentDeliveryReport.reported_date < mostRecentPregnancyReport.reported_date) {
    //Pregnancy report without delivery report, or Pregnancy report newer than Delivery report
    //Decide on the basis of Pregnancy report

    let mostRecentlySubmittedLMPDate = getMostRecentLMPDateForPregnancy(allReports, mostRecentPregnancyReport);
    if (!mostRecentlySubmittedLMPDate) {
      mostRecentlySubmittedLMPDate = moment(mostRecentPregnancyReport.reported_date);
    }
    if (mostRecentlySubmittedLMPDate < today.clone().subtract(MAX_DAYS_IN_PREGNANCY, 'day')) {
      return true;
      //Most recently submitted LMP is more than 294 days (42 weeks) ago
    }
    if (getRecentANCVisitWithEvent(allReports, mostRecentPregnancyReport, 'abortion') ||
      getRecentANCVisitWithEvent(allReports, mostRecentPregnancyReport, 'miscarriage')) {
      return true;
    }
  }

  else {
    //Both pregnancy and delivery report, Delivery report is newer than pregnancy report
    //Decide on the basis of Delivery report
    if (mostRecentPregnancyReport && getRecentANCVisitWithEvent(allReports, mostRecentPregnancyReport, 'abortion') ||
      getRecentANCVisitWithEvent(allReports, mostRecentPregnancyReport, 'miscarriage')) {
      return true;
    }
  }
  return false;
}

function isReadyForDelivery(thisContact, allReports) {
  //If pregnancy registration, date of LMP should be at least 6 months ago and no more than EDD + 6 weeks. 
  //If pregnancy registration and no LMP, make it available at registration and until 280 days + 6 weeks from the date of registration. 
  //If no pregnancy registration, previous delivery date should be at least 7 months ago.
  if (thisContact.type !== 'person') { return false; }
  const latestPregnancy = getNewestReport(allReports, pregnancyForms);
  const latestDelivery = getNewestReport(allReports, deliveryForms);
  if (!latestPregnancy && !latestDelivery) {
    //no previous pregnancy, no previous delivery
    return true;
  }
  else if (latestDelivery && (!latestPregnancy || latestDelivery.reported_date > latestPregnancy.reported_date)) {
    //no pregnancy registration, previous delivery date should be at least 7 months ago.
    return getDeliveryDate(latestDelivery) < today.clone().subtract(7, 'months');
  }

  else if (latestPregnancy) {
    if (isPregnancyForm(latestPregnancy)) {
      const lmpDate = getMostRecentLMPDateForPregnancy(allReports, latestPregnancy);
      if (!lmpDate) {//no LMP, show until 280 days + 6 weeks from the date of registration
        return moment(latestPregnancy.reported_date).clone().startOf('day').add(280 + 6 * 7, 'days').isSameOrBefore(today);
      }
      else {//Pregnancy registration with LMP
        const edd = getMostRecentEDDForPregnancy(allReports, latestPregnancy);
        //at least 6 months ago, no more than EDD + 6 weeks
        return today.isBetween(lmpDate.clone().add(6, 'months'), edd.clone().add(6, 'weeks'));
      }
    }
  }
  return false;
}

function getRecentANCVisitWithEvent(allReports, pregnancyReport, event) {
  //event can be one of miscarriage, abortion, refused, migrated
  const followUps = getSubsequentPregnancyFollowUps(allReports, pregnancyReport);
  const latestFollowup = getNewestReport(followUps, antenatalForms);
  if (latestFollowup && getField(latestFollowup, 'pregnancy_summary.visit_option') === event) {
    return latestFollowup;
  }
}

function getSubsequentDeliveries(allReports, pregnancyReport, withinLastXDays) {
  return allReports.filter(function (report) {
    return (isDeliveryForm(report)) &&
      report.reported_date > pregnancyReport.reported_date &&
      (!withinLastXDays || report.reported_date >= (today.clone().subtract(withinLastXDays, 'days')));
  });
}

function getSubsequentPregnancyFollowUps(allReports, pregnancyReport) {
  let lmpDate = getLMPDateFromPregnancy(pregnancyReport);
  if (!lmpDate) { //LMP Date is not available, use reported date
    lmpDate = moment(pregnancyReport.reported_date);
  }
  const subsequentVisits = allReports.filter(function (visitReport) {
    return isPregnancyFollowUpForm(visitReport) &&
      visitReport.reported_date > pregnancyReport.reported_date &&
      moment(visitReport.reported_date) < lmpDate.clone().add(MAX_DAYS_IN_PREGNANCY, 'days');
  });
  return subsequentVisits;
}

function countANCFacilityVisits(allReports, pregnancyReport) {
  let ancHFVisits = 0;
  const pregnancyFollowUps = getSubsequentPregnancyFollowUps(allReports, pregnancyReport);
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

function knowsHIVStatusInPast3Months(allReports) {
  let knows = false;
  const pregnancyFormsIn3Months = getFormArraySubmittedInWindow(allReports, pregnancyForms, today.clone().subtract(3, 'months'), today);
  pregnancyFormsIn3Months.forEach(function (report) {
    if (getField(report, 'pregnancy_new_or_current.hiv_status.hiv_status_know') === 'yes') {
      knows = true;
    }
  });
  return knows;
}

module.exports = {
  today,
  MAX_DAYS_IN_PREGNANCY,
  isHighRiskPregnancy,
  getNewestReport,
  getSubsequentPregnancyFollowUps,
  getSubsequentDeliveries,
  isAlive,
  isPregnant,
  isActivePregnancy,
  countANCFacilityVisits,
  knowsHIVStatusInPast3Months,
  getAllRiskFactors,
  getAllRiskFactorExtra,
  getDangerSignCodes,
  getLatestDangerSignsForPregnancy,
  getNextANCVisitDate,
  isReadyForNewPregnancy,
  isReadyForDelivery,
  getMostRecentLMPDateForPregnancy,
  getMostRecentEDDForPregnancy,
  getDeliveryDate,
  getFormArraySubmittedInWindow,
  getRecentANCVisitWithEvent,
  getField,
  getRiskFactorsFromPregnancy
};
