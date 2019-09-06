const moment = require('moment');
const today = moment().startOf('day');

const isReportValid = function (report) {
  if (report.form && report.fields && report.reported_date) return true;
  return false;
};
//

const pregnancyForms = ['pregnancy'];

const antenatalForms = ['pregnancy_home_visit'];

const deliveryForms = ['delivery'];

const pregnancDangerSignForms = ['pregnancy', 'pregnancy_home_visit', 'pregnancy_danger_sign', 'pregannacy_danger_sign_follow_up'];


const MAX_DAYS_IN_PREGNANCY = 44 * 7;  // 44 weeks
const AVG_DAYS_IN_PREGNANCY = 280;


const ancDangerSigns = [
  ['vaginal_bleeding', 'Vaginal bleeding'],
  ['fits', 'Fits'],
  ['severe_abdominal_pain', 'Severe abdominal pain'],
  ['severe_headache', 'Severe headache'],
  ['very_pale', 'Very pale'],
  ['fever', 'Fever'],
  ['reduced_or_no_foetal_movement', 'Reduced or no fetal movements'],
  ['breaking_water', 'Breaking of water'],
  ['easily_tired', 'Getting tired easily'],
  ['face_hand_swelling', 'Swelling of face and hands'],
  ['breathlessness', 'Breathlessness']
];

const ancRiskFactors = [
  ['first_pregnancy', 'First pregnancy'],
  ['previous_miscarriage', 'Previous miscarriages or stillbirths'],
  ['previous_difficulties', 'Previous difficulties in childbirth'],
  ['more_than_4_children', 'Has delivered four or more children'],
  ['last_baby_born_less_than_1_year_ago', 'Last baby born less than one year ago'],
  ['heart_condition', 'Heart condition'],
  ['asthma', 'Asthma'],
  ['high_blood_pressure', 'High blood pressure'],
  ['diabetes', 'Diabetes']
];

const pncDangerSigns = [
  ['fever', 'Fever'],
  ['severe_headache', 'Severe headache'],
  ['vaginal_bleeding', 'Vaginal bleeding'],
  ['vaginal_discharge', 'Fould smelling vaginal discharge']
];

const getField = (report, fieldPath) => ['fields', ...(fieldPath || '').split('.')]
  .reduce((prev, fieldName) => {
    if (prev === undefined) return report;
    return prev[fieldName];
  }, report);

function getFormArraySubmittedInWindow(allReports, formArray, start, end) {
  return allReports.filter(function (report) {
    return formArray.includes(report.form) &&
      report.reported_date >= start && report.reported_date <= end;
  });
}


function getNewestReport(allReports, forms) {
  let result = null;
  allReports.forEach(function (report) {
    if (!isReportValid(report) || forms.indexOf(report.form) < 0) { return null; }
    if (!result || report.reported_date > result.reported_date) {
      result = report;
    }
  });
  return result;
}


function getLMPDateFromPregnancy(report) {
  return isPregnancyForm(report) && getField(report, 'lmp_date_8601') && moment(getField(report, 'lmp_date_8601')) || null;
}

function getLMPDateFromPregnancyFollowUp(report) {
  return isPregnancyFollowUpForm(report) && getField(report, 'lmp_date_8601') && moment(getField(report, 'lmp_date_8601')) || null;
}

function getMostRecentLMPDateForPregnancy(allReports, pregnancyReport) {
  let mostRecentLMP = getLMPDateFromPregnancy(pregnancyReport);
  let mostRecentReportDate = pregnancyReport.reported_date;
  getSubsequentPregnancyFollowUps(allReports, pregnancyReport).forEach(function (visit) {
    const lmpFromPregnancyFollowUp = getLMPDateFromPregnancyFollowUp(visit);
    if (visit.reported_date > mostRecentReportDate && getField(visit, 'lmp_updated') === "yes") {
      mostRecentReportDate = visit.reported_date;
      mostRecentLMP = lmpFromPregnancyFollowUp;
    }
  })
  return mostRecentLMP;
}

function getMostRecentEDDForPregnancy(allReports, report) {
  const lmpDate = getMostRecentLMPDateForPregnancy(allReports, report);
  if (lmpDate) {
    return lmpDate.clone().add(AVG_DAYS_IN_PREGNANCY, 'days');
  }
  return null;
}

function getDeliveryDate(report) {
  return isDeliveryForm(report) && getField(report, 'delivery_outcome.delivery_date') && moment(getField(report, 'delivery_outcome.delivery_date'));
}

function getNextANCVisitDate(allReports, report) {
  let nextVisit = report.fields.t_pregnancy_follow_up_date;
  let eddReportDate = report.reported_date;
  const followUps = getSubsequentPregnancyFollowUps(allReports, report);
  followUps.forEach(function (followUpReport) {
    if (followUpReport.reported_date > eddReportDate && !!getField(followUpReport, 't_pregnancy_follow_up_date')) {
      eddReportDate = followUpReport.reported_date;
      nextVisit = followUpReport.fields.t_pregnancy_follow_up_date;
    }
  });
  return moment(nextVisit);
}


function getDangerSigns(report, ANCorPNC) {
  const dangerSigns = [];
  const dangerSignsList = ANCorPNC === 'ANC' ? ancDangerSigns : pncDangerSigns;
  if (getField(report, 't_danger_signs_referral_follow_up') === 'yes') {
    const dangerSignsObj = getField(report, 'danger_signs');
    dangerSignsList.forEach(function (ds) {
      if (dangerSignsObj[ds[0]] === "yes") {
        dangerSigns.push(ds[1]);
      }
    });
  }
  return dangerSigns;
}

function getLatestDangerSignsForPregnancy(allReports, pregnancy) {
  if (!pregnancy) return [];
  let lmpDate = getMostRecentLMPDateForPregnancy(allReports, pregnancy);
  if (!lmpDate) lmpDate = moment(pregnancy.reported_date); //If unknown, take preganacy.reported_date
  const allReportsWithDangerSigns = getFormArraySubmittedInWindow(allReports, pregnancDangerSignForms, lmpDate.toDate(), lmpDate.clone().add(MAX_DAYS_IN_PREGNANCY, 'days').toDate());
  const allRelevantReports = [];
  allReportsWithDangerSigns.forEach((report) => {
    if (isPregnancyFollowUpForm(report)) {
      //only push pregnancy home visit allReports that have actually been visited
      if (getField(report, 'pregnancy_summary.visit_option') === 'yes') {
        allRelevantReports.push(report);
      }
      //else do nothing
    }
    //for other forms, push
    else {
      allRelevantReports.push(report);
    }
  })
  const recentReport = getNewestReport(allRelevantReports, pregnancDangerSignForms);
  if (!recentReport) return [];
  return getDangerSigns(recentReport, 'ANC');
}


function getRiskFactorCodesFromPregnancy(report) {
  let riskFactors = [];
  if (!isPregnancyForm(report)) return [];
  if (getField(report, 'risk_factors.r_risk_factor_present') === 'yes') {
    if (getField(report, 'risk_factors.risk_factors_history.first_pregnancy') === 'yes') {
      riskFactors.push('first_pregnancy');
    }
    if (getField(report, 'risk_factors.risk_factors_history.previous_miscarriage') === 'yes') {
      riskFactors.push('previous_miscarriage');
    }
    const riskFactorsPrimary = getField(report, 'risk_factors.risk_factors_present.primary_condition');
    const riskFactorsSecondary = getField(report, 'risk_factors.risk_factors_present.secondary_condition');
    if (typeof (riskFactorsPrimary) !== 'undefined') {
      riskFactors = riskFactors.concat(riskFactorsPrimary.split(' '));
    }
    else if (typeof (riskFactorsSecondary) !== 'undefined') {
      riskFactors = riskFactors.concat(riskFactorsSecondary.split(' '));
    }
  }
  return riskFactors;
}

function getNewRiskFactorCodesFromFollowUps(report) {
  let riskFactors = [];
  if (!isPregnancyFollowUpForm(report)) return [];
  if (getField(report, 'anc_visits_hf.risk_factors.r_risk_factor_present') === 'yes') {
    const newRiskFactors = getField(report, 'anc_visits_hf.risk_factors.new_risks');
    if (typeof (newRiskFactors) !== 'undefined') {
      riskFactors = riskFactors.concat(newRiskFactors.split(' '));
    }
  }
  return riskFactors;
}

function getAllRiskFactorCodes(allReports, pregnancy) {
  let riskFactorCodes = getRiskFactorCodesFromPregnancy(pregnancy);
  const pregnancyFollowUps = getSubsequentPregnancyFollowUps(allReports, pregnancy);
  pregnancyFollowUps.forEach(function (v) {
    riskFactorCodes = riskFactorCodes.concat(getNewRiskFactorCodesFromFollowUps(v));
  });
  return riskFactorCodes;
}

function getRiskFactorTextFromCodes(riskFactorCodes) {
  const riskFactorsText = [];
  ancRiskFactors.forEach(function (arf) {
    if (riskFactorCodes.indexOf(arf[0]) > -1) {
      riskFactorsText.push(arf[1]);
    }
  });
  return riskFactorsText;
}

function getRiskFactorExtra(report) {
  if (report && isPregnancyForm(report)) {
    return getField(report, 'risk_factors.risk_factors_present.additional_risk') || null;
  }
  else if (report && isPregnancyFollowUpForm(report)) {
    return getField(report, 'anc_visits_hf.risk_factors.additional_risk') || null;
  }
  return null;
}


const isHighRiskPregnancy = function (allReports, pregnancy) {
  const h = getAllRiskFactorCodes(allReports, pregnancy).length > 0 || getDangerSigns(pregnancy).length > 0;
  return h;
};

function isAlive(thisContact) {
  return thisContact && !thisContact.date_of_death;
}

function isPregnancyForm(report) {
  return report && pregnancyForms.indexOf(report.form) > -1;
}

function isPregnancyFollowUpForm(report) {
  return report && antenatalForms.indexOf(report.form) > -1;
}

function isDeliveryForm(report) {
  return report && deliveryForms.indexOf(report.form) > -1;
}

function getSubsequentPregnancies(allReports, refReport) {
  return allReports.filter(function (report) {
    return isPregnancyForm(report) && report.reported_date > refReport.reported_date;
  });
}


function isActivePregnancy(thisContact, allReports, report) {
  if (thisContact.type !== 'person' || !isAlive(thisContact) || !isPregnancyForm(report)) return false;
  let lmpDate = getMostRecentLMPDateForPregnancy(allReports, report);
  if (lmpDate === null) { //LMP Date is not available, use reported date
    lmpDate = report.reported_date;
  }
  return lmpDate > today.clone().subtract(294, 'day') && //Pregnancy registration in the past 9 months
    !getSubsequentDeliveries(allReports, report, 6 * 7).length && //pregnancy not terminated by delivery in last 6 weeks
    !getSubsequentPregnancies(allReports, report).length &&//pregnancy not terminated by another pregnancy report
    getRecentANCVisitWithEvent(allReports, report, 'abortion') === null &&//pregnancy not terminated by miscarriage or abortion
    getRecentANCVisitWithEvent(allReports, report, 'miscarriage') === null;
}

function isPregnant(allReports) {
  return allReports.some(report => isActivePregnancy(report)); //has a pregnancy report submitted which is still active
}

function isReadyForNewPregnancy(thisContact, allReports) {
  if (thisContact.type !== 'person') return false;
  const mostRecentPregnancyReport = getNewestReport(allReports, pregnancyForms);
  const mostRecentDeliveryReport = getNewestReport(allReports, deliveryForms);
  if (mostRecentPregnancyReport === null && mostRecentDeliveryReport === null) {
    return true; //No previous pregnancy or delivery recorded, fresh profile
  }

  else if (mostRecentPregnancyReport === null) {//mostRecentDeliveryReport is not null
    //Delivery report without pregnancy report
    //Decide on the basis of Delivery report

    if (mostRecentDeliveryReport && getDeliveryDate(mostRecentDeliveryReport) < today.clone().subtract(6 * 7, 'day')) {
      return true; //Delivery date on most recentlty submitted delivery form is more than 6 weeks ago
    }
  }

  else if (mostRecentDeliveryReport === null || mostRecentDeliveryReport.reported_date < mostRecentPregnancyReport.reported_date) {
    //Pregnancy report without delivery report, or Pregnancy report newer than Delivery report
    //Decide on the basis of Pregnancy report

    let mostRecentlySubmittedLMPDate = getMostRecentLMPDateForPregnancy(allReports, mostRecentPregnancyReport);
    if (mostRecentlySubmittedLMPDate === null) {
      mostRecentlySubmittedLMPDate = moment(mostRecentPregnancyReport.reported_date);
    }
    if (mostRecentlySubmittedLMPDate < today.clone().subtract(294, 'day')) {
      return true;
      //Most recently submitted LMP is more than 294 days ago
    }
    if (getRecentANCVisitWithEvent(allReports, mostRecentPregnancyReport, 'abortion') ||
      getRecentANCVisitWithEvent(allReports, mostRecentPregnancyReport, 'miscarriage')) {
      return true;
      //Miscarriage/abortion was reported on latest pregnancy
    }
  }

  else {
    //Both pregnancy and delivery report, Delivery report is newer than pregnancy report
    //Decide on the basis of Delivery report
    if (mostRecentPregnancyReport && getRecentANCVisitWithEvent(allReports, mostRecentPregnancyReport, 'abortion') ||
      getRecentANCVisitWithEvent(allReports, mostRecentPregnancyReport, 'miscarriage')) { //Miscarriage/abortion was reported on latest pregnancy
      return true;
    }
  }
  return false;
}

function isReadyForDelivery(thisContact, allReports) {
  //If pregnancy registration, date of LMP should be at least 6 months ago and no more than EDD + 6 weeks. 
  //If pregnancy registration and no LMP, make it available at registration and until 280 days + 6 weeks from the date of registration. 
  //If no pregnancy registration, previous delivery date should be at least 7 months ago.
  if (thisContact.type !== 'person') return false;
  const latestPregnancy = getNewestReport(allReports, pregnancyForms);
  const latestDelivery = getNewestReport(allReports, deliveryForms);
  if (!latestPregnancy && !latestDelivery) {
    return true;//no pregnancy, no previous delivery
  }
  else if (latestDelivery && (!latestPregnancy || latestDelivery.reported_date > latestPregnancy.reported_date)) {
    //no pregnancy registration, previous delivery date should be at least 7 months ago.
    return getDeliveryDate(latestDelivery) < today.clone().subtract(7, 'months');
  }

  else if (latestPregnancy) {//pregnancy registration
    if (isPregnancyForm(latestPregnancy)) {
      const lmpDate = getMostRecentLMPDateForPregnancy(allReports, latestPregnancy);
      if (lmpDate === null) {//no LMP, show until 280 days + 6 weeks from the date of registration
        return moment(latestPregnancy.reported_date).clone().startOf('day').add(280 + 6 * 7, 'days').isSameOrBefore(today);
        //return today <= addDays(latestPregnancy.reported_date, 280 + 6 * 7);
      }
      else {//Pregnancy registration with LMP
        const edd = getMostRecentEDDForPregnancy(allReports, latestPregnancy);
        return today.isBetween(lmpDate.clone().add(6, 'months'), edd.clone().add(6, 'weeks'));
        //return addMonths(lmpDate, 6) < today && today < addDays(edd, 6 * 7); //at least 6 months ago, no more than EDD + 6 weeks
      }
    }
  }
  return false;
}

function getRecentANCVisitWithEvent(allReports, pregnancyReport, event) { //miscarriage, abortion, refused, migrated
  const followUps = getSubsequentPregnancyFollowUps(allReports, pregnancyReport);
  const latestFollowup = getNewestReport(followUps, antenatalForms);
  if (latestFollowup && getField(latestFollowup, 'pregnancy_summary.visit_option') === event) {
    return latestFollowup;
  }
  return null;
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
  if (lmpDate === null) { //LMP Date is not available, use reported date
    lmpDate = moment(pregnancyReport.reported_date);
  }
  const subsequentVisits = allReports.filter(function (visitReport) {
    return isPregnancyFollowUpForm(visitReport) &&
      visitReport.reported_date > pregnancyReport.reported_date &&
      moment(visitReport.reported_date) < lmpDate.clone().add(MAX_DAYS_IN_PREGNANCY, 'days');
  });
  return subsequentVisits;
}

function countANCFacilityVisits(allReports, pregnancy) {
  //from pregnancy report: How many times has ${patient_short_name} been to the health facility for ANC? [anc_visits_hf/anc_visits_hf_past/visited_hf_count]
  //from pregnancy visit report:
  //Did the woman complete the health facility ANC visit scheduled for ${pregnancy_follow_up_date_recent}? [anc_visits_hf/anc_visits_hf_past/last_visit_attended]
  //Would you like to report any additional unreported health facility ANC visits? [anc_visits_hf/anc_visits_hf_past/report_other_visits]

  //How many? [anc_visits_hf/anc_visits_hf_past/visited_hf_count]
  let ancHFVisits = 0;
  const pregnancyFollowUps = getSubsequentPregnancyFollowUps(allReports, pregnancy);
  if (getField(pregnancy, 'anc_visits_hf.anc_visits_hf_past')) {
    ancHFVisits += parseInt(getField(pregnancy, 'anc_visits_hf.anc_visits_hf_past.visited_hf_count'));
  }
  pregnancyFollowUps.forEach(function (report) {
    if (getField(report, 'anc_visits_hf.anc_visits_hf_past')) {
      const pastANCHFVisits = getField(report, 'anc_visits_hf.anc_visits_hf_past');
      if (pastANCHFVisits.last_visit_attended === 'yes') {
        ancHFVisits += 1;
      }
      if (pastANCHFVisits.report_other_visits === 'yes') {
        ancHFVisits += parseInt(pastANCHFVisits.visited_hf_count);
      }
    }
  });
  return isNaN(ancHFVisits) ? 0 : ancHFVisits;
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
  getAllRiskFactorCodes,
  getRiskFactorTextFromCodes,
  getRiskFactorExtra,
  getDangerSigns,
  getLatestDangerSignsForPregnancy,
  getNextANCVisitDate,
  isReadyForNewPregnancy,
  isReadyForDelivery,
  getMostRecentLMPDateForPregnancy,
  getMostRecentEDDForPregnancy,
  getDeliveryDate,
  getFormArraySubmittedInWindow,
  getRecentANCVisitWithEvent,
  getField
};