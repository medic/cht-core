const moment = require('moment');
/*eslint no-unused-vars: "error"*/
const today = moment().startOf('day');
//console.log('today', today.format());

const isReportValid = function (r) {
  if (r.form && r.fields && r.reported_date) return true;
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



function getFormArraySubmittedInWindow(reports, formArray, start, end) {
  return reports.filter(function (report) {
    return formArray.indexOf(report.form) >= 0 &&
      report.reported_date >= start && report.reported_date <= end;
  });
}


function getNewestReport(reports, forms) {
  let result = null;
  reports.forEach(function (report) {
    if (!isReportValid(report) || forms.indexOf(report.form) < 0) { return null; }
    if (!result || report.reported_date > result.reported_date) {
      result = report;
    }
  });
  return result;
}


function getLMPDateFromPregnancy(r) {
  if (isPregnancyForm(r)) {
    if (r.fields && r.fields.lmp_date_8601) {
      return moment(r.fields.lmp_date_8601);
    }
  }
  return null;
}

function getLMPDateFromPregnancyFollowUp(r) {
  if (isPregnancyFollowUpForm(r)) {
    if (r.fields && r.fields.lmp_date_8601) {
      return moment(r.fields.lmp_date_8601);
    }
  }
  return null;
}

function getMostRecentLMPDateForPregnancy(r) {
  let mostRecentLMP = getLMPDateFromPregnancy(r);
  //console.log('lmp1', mostRecentLMP);
  let mostRecentReportDate = r.reported_date;
  getSubsequentPregnancyFollowUps(r).forEach(function (v) {
    const lmpFromPregnancyFollowUp = getLMPDateFromPregnancyFollowUp(v);
    if (v.reported_date > mostRecentReportDate && v.fields.lmp_updated === "yes") {
      mostRecentReportDate = v.reported_date;
      mostRecentLMP = lmpFromPregnancyFollowUp;
    }
  })
  //console.log('lmp2', mostRecentLMP);
  return mostRecentLMP;
}

function getMostRecentEDDForPregnancy(r) {
  const lmpDate = getMostRecentLMPDateForPregnancy(r);
  //console.log('lmp', lmpDate);
  if (lmpDate) {
    return lmpDate.clone().add(AVG_DAYS_IN_PREGNANCY, 'days');
  }
  return null;
}

function getDeliveryDate(r) {
  if (isDeliveryForm(r) && r.fields && r.fields.delivery_outcome)
    return moment(r.fields.delivery_outcome.delivery_date);
}

function getNextANCVisitDate(r) {
  let nextVisit = r.fields.t_pregnancy_follow_up_date;
  let eddReportDate = r.reported_date;
  const followUps = getSubsequentPregnancyFollowUps(r);
  followUps.forEach(function (fr) {
    if (fr.reported_date > eddReportDate && fr.fields.t_pregnancy_follow_up_date && fr.fields.t_pregnancy_follow_up_date !== "") {
      eddReportDate = fr.reported_date;
      nextVisit = fr.fields.t_pregnancy_follow_up_date;
    }
  });
  return moment(nextVisit);
}


function getDangerSigns(report, ANCorPNC) {
  const dangerSigns = [];
  const dangerSignsList = ANCorPNC === 'ANC' ? ancDangerSigns : pncDangerSigns;
  if (report.fields && report.fields.danger_signs && report.fields.t_danger_signs_referral_follow_up === 'yes') {
    const dangerSignsObj = report.fields.danger_signs;
    dangerSignsList.forEach(function (ds) {
      if (dangerSignsObj[ds[0]] === "yes") {
        //console.log(ds);
        dangerSigns.push(ds[1]);
      }
    });
  }
  return dangerSigns;
}

function getLatestDangerSignsForPregnancy(pregnancy) {
  if (!pregnancy) return [];
  let lmpDate = getMostRecentLMPDateForPregnancy(pregnancy);
  if (!lmpDate) lmpDate = moment(pregnancy.reported_date); //If unknown, take preganacy.reported_date
  const allReports = getFormArraySubmittedInWindow(reports, pregnancDangerSignForms, lmpDate.toDate(), lmpDate.clone().add(MAX_DAYS_IN_PREGNANCY, 'days').toDate());
  const allRelevantReports = [];
  allReports.forEach((r) => {
    if (isPregnancyFollowUpForm(r)) {
      //Only push pregnancy home visit reports that have actually been visited
      if (r.fields && r.fields.pregnancy_summary && r.fields.pregnancy_summary.visit_option === 'yes') {
        allRelevantReports.push(r);
      }
    }
    else {
      allRelevantReports.push(r);
    }
  })
  const recentReport = getNewestReport(allRelevantReports, pregnancDangerSignForms);
  if (!recentReport) return [];
  return getDangerSigns(recentReport, 'ANC');
}


function getRiskFactorCodesFromPregnancy(r) {
  let riskFactors = [];
  if (!isPregnancyForm(r)) return [];
  if (r.fields) {
    if (r.fields.risk_factors && r.fields.risk_factors.r_risk_factor_present === 'yes') {
      if (r.fields.risk_factors.risk_factors_history && r.fields.risk_factors.risk_factors_history.first_pregnancy === 'yes') {
        riskFactors.push('first_pregnancy');
      }
      if (r.fields.risk_factors.risk_factors_history && r.fields.risk_factors.risk_factors_history.previous_miscarriage === 'yes') {
        riskFactors.push('previous_miscarriage');
      }
      if (r.fields.risk_factors.risk_factors_present) {
        const riskFactorsPrimary = r.fields.risk_factors.risk_factors_present.primary_condition;
        const riskFactorsSecondary = r.fields.risk_factors.risk_factors_present.secondary_condition;
        if (typeof (riskFactorsPrimary) !== 'undefined') {
          riskFactors = riskFactors.concat(riskFactorsPrimary.split(' '));
        }
        else if (typeof (riskFactorsSecondary) !== 'undefined') {
          riskFactors = riskFactors.concat(riskFactorsSecondary.split(' '));
        }
      }
    }
  }
  //console.log('rf1', riskFactors);
  return riskFactors;
}

function getNewRiskFactorCodesFromFollowUps(r) {
  let riskFactors = [];
  if (!isPregnancyFollowUpForm(r)) return [];
  if (r.fields && r.fields.anc_visits_hf && r.fields.anc_visits_hf.risk_factors && r.fields.anc_visits_hf.risk_factors.r_risk_factor_present === 'yes') {
    const newRiskFactors = r.fields.anc_visits_hf.risk_factors.new_risks;
    if (typeof (newRiskFactors) !== 'undefined') {
      riskFactors = riskFactors.concat(newRiskFactors.split(' '));
    }
  }
  return riskFactors;
}

function getAllRiskFactorCodes(pregnancy) {
  let riskFactorCodes = getRiskFactorCodesFromPregnancy(pregnancy);
  const pregnancyFollowUps = getSubsequentPregnancyFollowUps(pregnancy);
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
    return report.fields && report.fields.risk_factors && report.fields.risk_factors.risk_factors_present &&
      report.fields.risk_factors.risk_factors_present.additional_risk;
  }
  else if (report && isPregnancyFollowUpForm(report)) {
    return report.fields && report.fields.anc_visits_hf && report.fields.anc_visits_hf.risk_factors &&
      report.fields.anc_visits_hf.risk_factors.additional_risk;
  }
  return null;
}


const isHighRiskPregnancy = function (pregnancy) {
  const h = getAllRiskFactorCodes(pregnancy).length > 0 || getDangerSigns(pregnancy).length > 0;
  return h;
};

function isAlive(contact) {
  return contact && !contact.date_of_death;
}

function isPregnancyForm(r) {
  return r && pregnancyForms.indexOf(r.form) > -1;
}

function isPregnancyFollowUpForm(r) {
  return r && antenatalForms.indexOf(r.form) > -1;
}

function isDeliveryForm(r) {
  return r && deliveryForms.indexOf(r.form) > -1;
}

function getSubsequentPregnancies(reports, report) {
  //console.log(reports);
  return reports.filter(function (r) {
    return isPregnancyForm(r) && r.reported_date > report.reported_date;
  });
}


function isActivePregnancy(r) {
  //console.log('check active pregnancy');
  if (contact.type !== 'person' || !isAlive(contact) || !isPregnancyForm(r)) return false;
  //console.log('c1');
  let lmpDate = getMostRecentLMPDateForPregnancy(r);
  if (lmpDate === null) { //LMP Date is not available, use reported date
    lmpDate = r.reported_date;
  }
  //console.log('c2', lmpDate > today.clone().subtract(294, 'day'));
  //console.log('c3', !getSubsequentDeliveries(r, 6 * 7).length);
  //console.log('c4', !getSubsequentPregnancies(reports, r).length);
  //console.log('c5', !getRecentANCVisitWithEvent(r, 'abortion'), !getRecentANCVisitWithEvent(r, 'miscarriage'));
  return lmpDate > today.clone().subtract(294, 'day') && //Pregnancy registration in the past 9 months
    !getSubsequentDeliveries(r, 6 * 7).length && //pregnancy not terminated by delivery in last 6 weeks
    !getSubsequentPregnancies(reports, r).length &&//pregnancy not terminated by another pregnancy report
    getRecentANCVisitWithEvent(r, 'abortion') === null &&//pregnancy not terminated by miscarriage or abortion
    getRecentANCVisitWithEvent(r, 'miscarriage') === null;
}

function isPregnant() {
  const x = reports.some(r => isActivePregnancy(r)); //has a pregnancy report submitted which is still active
  //console.log('isPregnant', x);
  return x;
}

function isReadyForNewPregnancy() {
  if (contact.type !== 'person') return false;
  const mostRecentPregnancyReport = getNewestReport(reports, pregnancyForms);
  const mostRecentDeliveryReport = getNewestReport(reports, deliveryForms);
  if (mostRecentPregnancyReport === null && mostRecentDeliveryReport === null) {
    //console.log('true, no previous pregnancy');
    return true; //No previous pregnancy or delivery recorded, fresh profile
  }

  else if (mostRecentPregnancyReport === null) {//mostRecentDeliveryReport is not null
    //Delivery report without pregnancy report
    //Decide on the basis of Delivery report

    if (mostRecentDeliveryReport && getDeliveryDate(mostRecentDeliveryReport) < today.clone().subtract(6 * 7, 'day')) {
      //console.log('true, delivered more than 6 weeks ago');
      return true; //Delivery date on most recentlty submitted delivery form is more than 6 weeks ago
    }
  }

  else if (mostRecentDeliveryReport === null || mostRecentDeliveryReport.reported_date < mostRecentPregnancyReport.reported_date) {
    //Pregnancy report without delivery report, or Pregnancy report newer than Delivery report
    //Decide on the basis of Pregnancy report

    let mostRecentlySubmittedLMPDate = getMostRecentLMPDateForPregnancy(mostRecentPregnancyReport);
    if (mostRecentlySubmittedLMPDate === null) {
      mostRecentlySubmittedLMPDate = moment(mostRecentPregnancyReport.reported_date);
    }
    if (mostRecentlySubmittedLMPDate < today.clone().subtract(294, 'day')) {
      //console.log('true, LMP more than 294 days ago');
      return true;
      //Most recently submitted LMP is more than 294 days ago
    }
    if (getRecentANCVisitWithEvent(mostRecentPregnancyReport, 'abortion') ||
      getRecentANCVisitWithEvent(mostRecentPregnancyReport, 'miscarriage')) {
      //console.log('true, miscarriage/abortion');
      return true;
      //Miscarriage/abortion was reported on latest pregnancy
    }
  }

  else {
    //Both pregnancy and delivery report, Delivery report is newer than pregnancy report
    //Decide on the basis of Delivery report
    if (mostRecentPregnancyReport && getRecentANCVisitWithEvent(mostRecentPregnancyReport, 'abortion') ||
      getRecentANCVisitWithEvent(mostRecentPregnancyReport, 'miscarriage')) { //Miscarriage/abortion was reported on latest pregnancy
      //console.log('true, miscarriage/abortion');
      return true;
    }
  }
  //console.log('false, none');
  return false;
}

function isReadyForDelivery() {
  //If pregnancy registration, date of LMP should be at least 6 months ago and no more than EDD + 6 weeks. 
  //If pregnancy registration and no LMP, make it available at registration and until 280 days + 6 weeks from the date of registration. 
  //If no pregnancy registration, previous delivery date should be at least 7 months ago.
  if (contact.type !== 'person') return false;
  const latestPregnancy = getNewestReport(reports, pregnancyForms);
  const latestDelivery = getNewestReport(reports, deliveryForms);
  if (!latestPregnancy && !latestDelivery) {
    //console.log('d1', true);
    return true;//no pregnancy, no previous delivery
  }
  else if (latestDelivery && (!latestPregnancy || latestDelivery.reported_date > latestPregnancy.reported_date)) {
    //no pregnancy registration, previous delivery date should be at least 7 months ago.
    //console.log('d2', getDeliveryDate(latestDelivery) < addMonths(now, -7));
    return getDeliveryDate(latestDelivery) < today.clone().subtract(7, 'months');
  }

  else if (latestPregnancy) {//pregnancy registration
    if (isPregnancyForm(latestPregnancy)) {
      const lmpDate = getMostRecentLMPDateForPregnancy(latestPregnancy);
      if (lmpDate === null) {//no LMP, show until 280 days + 6 weeks from the date of registration
        //console.log('d3', now <= addDays(latestPregnancy.reported_date, 280 + 6 * 7));
        return moment(latestPregnancy.reported_date).clone().startOf('day').add(280 + 6 * 7, 'days').isSameOrBefore(today);
        //return today <= addDays(latestPregnancy.reported_date, 280 + 6 * 7);
      }
      else {//Pregnancy registration with LMP
        const edd = getMostRecentEDDForPregnancy(latestPregnancy);
        //console.log('d4', addMonths(lmpDate, 6) < now && now < addDays(edd, 6 * 7));
        return today.isBetween(lmpDate.clone().add(6, 'months'), edd.clone().add(6, 'weeks'));
        //return addMonths(lmpDate, 6) < today && today < addDays(edd, 6 * 7); //at least 6 months ago, no more than EDD + 6 weeks
      }
    }
  }
  //console.log('d5', false);
  return false;
}

function getRecentANCVisitWithEvent(r, event) { //miscarriage, abortion, refused, migrated
  const followUps = getSubsequentPregnancyFollowUps(r);
  const latestFollowup = getNewestReport(followUps, antenatalForms);
  if (latestFollowup && latestFollowup.fields.pregnancy_summary &&
    latestFollowup.fields.pregnancy_summary.visit_option === event) {
    return latestFollowup;
  }
  return null;
}

function getSubsequentDeliveries(pregnancyReport, withinLastXDays) {
  return reports.filter(function (r) {
    return (isDeliveryForm(r)) &&
      r.reported_date > pregnancyReport.reported_date &&
      (!withinLastXDays || r.reported_date >= (today.clone().subtract(withinLastXDays, 'days')));
  });
}

function getSubsequentPregnancyFollowUps(r) {
  let lmpDate = getLMPDateFromPregnancy(r);
  if (lmpDate === null) { //LMP Date is not available, use reported date
    lmpDate = moment(r.reported_date);
  }
  const subsequentVisits = reports.filter(function (v) {
    return isPregnancyFollowUpForm(v) &&
      v.reported_date > r.reported_date &&
      moment(v.reported_date) < lmpDate.clone().add(MAX_DAYS_IN_PREGNANCY, 'days');
  });
  return subsequentVisits;
}


function countANCFacilityVisits(pregnancy) {
  //from pregnancy report: How many times has ${patient_short_name} been to the health facility for ANC? [anc_visits_hf/anc_visits_hf_past/visited_hf_count]
  //from pregnancy visit report:
  //Did the woman complete the health facility ANC visit scheduled for ${pregnancy_follow_up_date_recent}? [anc_visits_hf/anc_visits_hf_past/last_visit_attended]
  //Would you like to report any additional unreported health facility ANC visits? [anc_visits_hf/anc_visits_hf_past/report_other_visits]

  //How many? [anc_visits_hf/anc_visits_hf_past/visited_hf_count]
  let ancHFVisits = 0;
  const pregnancyFollowUps = getSubsequentPregnancyFollowUps(pregnancy);
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
  //console.log('count', ancHFVisits);
  return ancHFVisits;
}

function knowsHIVStatusInPast3Months() {
  let knows = false;
  const pregnancyFormsIn3Months = getFormArraySubmittedInWindow(reports, pregnancyForms, today.clone().subtract(3, 'months'), today);
  pregnancyFormsIn3Months.forEach(function (r) {
    if (r.fields && r.fields.pregnancy_new_or_current && r.fields.pregnancy_new_or_current.hiv_status && r.fields.pregnancy_new_or_current.hiv_status.hiv_status_know === 'yes')
      knows = true;
    return;
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
  getRecentANCVisitWithEvent
};