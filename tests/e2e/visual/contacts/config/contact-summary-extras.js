const moment = require('moment');
const today = moment().startOf('day');
const now = Date.now();

const pregnancyForms = ['pregnancy'];
const antenatalForms = ['pregnancy_home_visit'];
const deliveryForms = ['delivery'];
const pregnancDangerSignForms = [
  'pregnancy',
  'pregnancy_home_visit',
  'pregnancy_danger_sign',
  'pregnancy_danger_sign_follow_up'
];
const MAX_DAYS_IN_PREGNANCY = 42 * 7;
const AVG_DAYS_IN_PREGNANCY = 280;
const IMMUNIZATION_DOSES = [
  ['hep_a_1', 'HA1'],
  ['hep_a_2', 'HA2'],
  ['flu', 'FLU'],
  ['polio_0', 'OPV0'],
  ['polio_1', 'OPV1'],
  ['polio_2', 'OPV2'],
  ['polio_3', 'OPV3'],
  ['penta_1', 'PENTA1'],
  ['penta_2', 'PENTA2'],
  ['penta_3', 'PENTA3'],
  ['rotavirus_1', 'ROTA1'],
  ['rotavirus_2', 'ROTA2'],
  ['rotavirus_3', 'ROTA3']
];
const IMMUNIZATION_LIST = [
  'hep_a',
  'flu',
  'polio',
  'penta',
  'rotavirus'
];
const immunizationForms = [
  'PENTA1',
  'PENTA2',
  'PENTA3',
  'OPV0',
  'OPV1',
  'OPV2',
  'OPV3',
  'ROTA1',
  'ROTA2',
  'ROTA3',
  'FLU',
  'HA1',
  'HA2'
];

const isReportValid = (report) => {
  return (
    report.form &&
    report.fields &&
    report.reported_date
  );
};

const getField = (report, fieldPath) => ['fields', ...(fieldPath || '').split('.')]
  .reduce((prev, fieldName) => {
    if (prev === undefined) {
      return undefined;
    }
    return prev[fieldName];
  }, report);

const getFormArraySubmittedInWindow = (allReports, formArray, start, end) => allReports.filter(
  (report) => formArray.includes(report.form) &&
      report.reported_date >= start &&
      report.reported_date <= end
);

const getNewestReport = (allReports, forms) => {
  const result = allReports
    .filter((report) => isReportValid(report) && forms.includes(report.form))
    .reduce((newest, report) => {
      return !newest || report.reported_date > newest.reported_date ? report : newest;
    }, null);

  return result;
};

const getLMPDateFromPregnancy = (report) => {
  const lmpDate = getField(report, 'lmp_date_8601');
  return isPregnancyForm(report) && lmpDate && moment(lmpDate);
};

const getLMPDateFromPregnancyFollowUp = (report) => {
  const lmpDate = getField(report, 'lmp_date_8601');
  return isPregnancyFollowUpForm(report) && lmpDate && moment(lmpDate);
};

const getMostRecentLMPDateForPregnancy = (allReports, pregnancyReport) => {
  let mostRecentLMP = getLMPDateFromPregnancy(pregnancyReport);
  let mostRecentReportDate = pregnancyReport.reported_date;

  getSubsequentPregnancyFollowUps(allReports, pregnancyReport).forEach((visit) => {
    const lmpFromPregnancyFollowUp = getLMPDateFromPregnancyFollowUp(visit);
    const lmpUpdated = getField(visit, 'lmp_updated') === 'yes';

    if (visit.reported_date > mostRecentReportDate && lmpUpdated) {
      mostRecentReportDate = visit.reported_date;
      mostRecentLMP = lmpFromPregnancyFollowUp;
    }
  });

  return mostRecentLMP;
};

const getMostRecentEDDForPregnancy = (allReports, report) => {
  const lmpDate = getMostRecentLMPDateForPregnancy(allReports, report);

  if (!lmpDate) {
    return;
  }

  return lmpDate.clone().add(AVG_DAYS_IN_PREGNANCY, 'days');
};

const getDeliveryDate = (report) => {
  const deliveryDate = getField(report, 'delivery_outcome.delivery_date');

  return isDeliveryForm(report) && deliveryDate && moment(deliveryDate);
};

const getNextANCVisitDate = (allReports, report) => {
  let nextVisit = getField(report, 't_pregnancy_follow_up_date');
  let eddReportDate = report.reported_date;

  const followUps = getSubsequentPregnancyFollowUps(allReports, report);

  followUps.forEach((followUpReport) => {
    const followUpDate = getField(followUpReport, 't_pregnancy_follow_up_date');

    if (followUpReport.reported_date > eddReportDate && followUpDate) {
      eddReportDate = followUpReport.reported_date;
      nextVisit = followUpDate;
    }
  });

  return moment(nextVisit);
};

const getDangerSignCodes = (report) => {
  const dangerSignCodes = [];

  if (getField(report, 't_danger_signs_referral_follow_up') === 'yes') {
    const dangerSignsObj = getField(report, 'danger_signs');

    if (dangerSignsObj) {
      Object.keys(dangerSignsObj).forEach((dangerSign) => {
        if (dangerSignsObj[dangerSign] === 'yes' && dangerSign !== 'r_danger_sign_present') {
          dangerSignCodes.push(dangerSign);
        }
      });
    }
  }

  return dangerSignCodes;
};

const getLatestDangerSignsForPregnancy = (allReports, pregnancy) => {
  if (!pregnancy) {
    return [];
  }

  let lmpDate = getMostRecentLMPDateForPregnancy(allReports, pregnancy);
  if (!lmpDate) {
    lmpDate = moment(pregnancy.reported_date);
  }

  const allReportsWithDangerSigns = getFormArraySubmittedInWindow(
    allReports,
    pregnancDangerSignForms,
    lmpDate.toDate(),
    lmpDate.clone().add(MAX_DAYS_IN_PREGNANCY, 'days').toDate()
  );

  const allRelevantReports = [];
  allReportsWithDangerSigns.forEach((report) => {
    if (isPregnancyFollowUpForm(report)) {
      if (getField(report, 'pregnancy_summary.visit_option') === 'yes') {
        allRelevantReports.push(report);
      }
    } else {
      allRelevantReports.push(report);
    }
  });

  const recentReport = getNewestReport(allRelevantReports, pregnancDangerSignForms);
  if (!recentReport) {
    return [];
  }

  return getDangerSignCodes(recentReport);
};


const getRiskFactorsFromPregnancy = (report) => {
  const riskFactors = [];

  if (!isPregnancyForm(report)) {
    return [];
  }

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
};

const getNewRiskFactorsFromFollowUps = (report) => {
  const riskFactors = [];

  if (!isPregnancyFollowUpForm(report)) {
    return [];
  }

  if (getField(report, 'anc_visits_hf.risk_factors.r_risk_factor_present') === 'yes') {
    const newRiskFactors = getField(report, 'anc_visits_hf.risk_factors.new_risks');

    if (newRiskFactors) {
      riskFactors.push(...newRiskFactors.split(' '));
    }
  }

  return riskFactors;
};

const getAllRiskFactors = (allReports, pregnancy) => {
  const riskFactorCodes = getRiskFactorsFromPregnancy(pregnancy);
  const pregnancyFollowUps = getSubsequentPregnancyFollowUps(allReports, pregnancy);

  pregnancyFollowUps.forEach((visit) => {
    riskFactorCodes.push(...getNewRiskFactorsFromFollowUps(visit));
  });

  return riskFactorCodes;
};

const getRiskFactorExtra = (report) => {
  if (!report){
    return;
  }

  if (isPregnancyForm(report)) {
    return getField(report, 'risk_factors.risk_factors_present.additional_risk');
  }

  if (isPregnancyFollowUpForm(report)) {
    return getField(report, 'anc_visits_hf.risk_factors.additional_risk');
  }
};

const getAllRiskFactorExtra = (allReports, pregnancy) => {
  const riskFactorsExtra = [];

  const riskFactorExtraFromPregnancy = getRiskFactorExtra(pregnancy);
  if (riskFactorExtraFromPregnancy) {
    riskFactorsExtra.push(riskFactorExtraFromPregnancy);
  }

  const pregnancyFollowUps = getSubsequentPregnancyFollowUps(allReports, pregnancy);
  pregnancyFollowUps.forEach((visit) => {
    const riskFactorExtraFromVisit = getRiskFactorExtra(visit);
    if (riskFactorExtraFromVisit) {
      riskFactorsExtra.push(riskFactorExtraFromVisit);
    }
  });

  return riskFactorsExtra;
};

const isHighRiskPregnancy = (allReports, pregnancy) => {
  const riskFactors = getAllRiskFactors(allReports, pregnancy);
  const riskFactorExtra = getAllRiskFactorExtra(allReports, pregnancy);
  const dangerSigns = getDangerSignCodes(pregnancy);

  return riskFactors.length > 0 || riskFactorExtra.length > 0 || dangerSigns.length > 0;
};

const isAlive = (thisContact) => thisContact && !thisContact.date_of_death;

const isPregnancyForm = (report) => report && pregnancyForms.includes(report.form);

const isPregnancyFollowUpForm = (report) => report && antenatalForms.includes(report.form);

const isDeliveryForm = (report) => report && deliveryForms.includes(report.form);

const getSubsequentPregnancies = (allReports, refReport) => allReports.filter(
  (report) => isPregnancyForm(report) &&
      report.reported_date > refReport.reported_date
);

const isActivePregnancy = (thisContact, allReports, report) => {
  if (
    thisContact.type !== 'person' ||
    !isAlive(thisContact) ||
    !isPregnancyForm(report)
  ) {
    return false;
  }

  const lmpDate =
    getMostRecentLMPDateForPregnancy(allReports, report) ||
    report.reported_date;

  const isPregnancyRegisteredWithin9Months =
    lmpDate > today.clone().subtract(MAX_DAYS_IN_PREGNANCY, 'days');

  const isPregnancyTerminatedByDeliveryInLast6Weeks =
    getSubsequentDeliveries(allReports, report, 6 * 7).length > 0;

  const isPregnancyTerminatedByAnotherPregnancyReport =
    getSubsequentPregnancies(allReports, report).length > 0;

  return (
    isPregnancyRegisteredWithin9Months &&
    !isPregnancyTerminatedByDeliveryInLast6Weeks &&
    !isPregnancyTerminatedByAnotherPregnancyReport &&
    !getRecentANCVisitWithEvent(allReports, report, 'abortion') &&
    !getRecentANCVisitWithEvent(allReports, report, 'miscarriage')
  );
};

const isPregnant = (allReports) => allReports.some((report) => isActivePregnancy(report));

const isReadyForNewPregnancy = (thisContact, allReports) => {
  if (thisContact.type !== 'person') {
    return false;
  }

  const mostRecentPregnancyReport = getNewestReport(allReports, pregnancyForms);
  const mostRecentDeliveryReport = getNewestReport(allReports, deliveryForms);

  if (!mostRecentPregnancyReport && !mostRecentDeliveryReport) {
    // No previous pregnancy or delivery recorded, fresh profile
    return true;
  }

  if (!mostRecentPregnancyReport) {
    // Delivery report without pregnancy report
    const deliveryDate = getDeliveryDate(mostRecentDeliveryReport);
    return deliveryDate && deliveryDate < today.clone().subtract(6 * 7, 'day');
  }

  const isPregnancyNewer =
    !mostRecentDeliveryReport ||
    mostRecentDeliveryReport.reported_date < mostRecentPregnancyReport.reported_date;

  if (isPregnancyNewer) {
    // Pregnancy report newer than delivery or no delivery report
    const lmpDate =
      getMostRecentLMPDateForPregnancy(allReports, mostRecentPregnancyReport) ||
      moment(mostRecentPregnancyReport.reported_date);

    if (lmpDate < today.clone().subtract(MAX_DAYS_IN_PREGNANCY, 'day')) {
      return true;
    }

    return (
      getRecentANCVisitWithEvent(allReports, mostRecentPregnancyReport, 'abortion') ||
      getRecentANCVisitWithEvent(allReports, mostRecentPregnancyReport, 'miscarriage')
    );
  }

  // Both pregnancy and delivery report; delivery report is newer
  return (
    getRecentANCVisitWithEvent(allReports, mostRecentPregnancyReport, 'abortion') ||
    getRecentANCVisitWithEvent(allReports, mostRecentPregnancyReport, 'miscarriage')
  );
};

const isReadyForDelivery = (thisContact, allReports) => {
  if (thisContact.type !== 'person') {
    return false;
  }

  const latestPregnancy = getNewestReport(allReports, pregnancyForms);
  const latestDelivery = getNewestReport(allReports, deliveryForms);

  if (!latestPregnancy && !latestDelivery) {
    // No previous pregnancy or delivery
    return true;
  }

  if (
    latestDelivery &&
    (!latestPregnancy || latestDelivery.reported_date > latestPregnancy.reported_date)
  ) {
    // No pregnancy registration; check if previous delivery was at least 7 months ago
    return getDeliveryDate(latestDelivery) < today.clone().subtract(7, 'months');
  }

  if (latestPregnancy) {
    const lmpDate = getMostRecentLMPDateForPregnancy(allReports, latestPregnancy);
    if (!lmpDate) {
      // No LMP; show readiness until 280 days + 6 weeks from the registration date
      return moment(latestPregnancy.reported_date)
        .clone()
        .startOf('day')
        .add(280 + 6 * 7, 'days')
        .isSameOrBefore(today);
    }

    const edd = getMostRecentEDDForPregnancy(allReports, latestPregnancy);
    // Pregnancy registration with LMP; check readiness between 6 months after LMP and EDD + 6 weeks
    return today.isBetween(
      lmpDate.clone().add(6, 'months'),
      edd.clone().add(6, 'weeks')
    );
  }

  return false;
};

const getRecentANCVisitWithEvent = (allReports, pregnancyReport, event) => {
  const followUps = getSubsequentPregnancyFollowUps(allReports, pregnancyReport);
  const latestFollowUp = getNewestReport(followUps, antenatalForms);

  return latestFollowUp &&
    getField(latestFollowUp, 'pregnancy_summary.visit_option') === event
    ? latestFollowUp
    : undefined;
};

const getSubsequentDeliveries = (allReports, pregnancyReport, withinLastXDays) => allReports.filter((report) => {
  const isAfterPregnancy = report.reported_date > pregnancyReport.reported_date;
  const isWithinDays = !withinLastXDays || report.reported_date >= today.clone().subtract(withinLastXDays, 'days');
  return isDeliveryForm(report) && isAfterPregnancy && isWithinDays;
});

const getSubsequentPregnancyFollowUps = (allReports, pregnancyReport) => {
  const lmpDate = getLMPDateFromPregnancy(pregnancyReport) || moment(pregnancyReport.reported_date);

  return allReports.filter(visitReport => isPregnancyFollowUpForm(visitReport) &&
    visitReport.reported_date > pregnancyReport.reported_date &&
    moment(visitReport.reported_date).isBefore(lmpDate.clone().add(MAX_DAYS_IN_PREGNANCY, 'days')));
};

const countANCFacilityVisits = (allReports, pregnancyReport) => {
  let ancHFVisits = 0;

  const initialVisits = getField(pregnancyReport, 'anc_visits_hf.anc_visits_hf_past.visited_hf_count');
  if (initialVisits && !isNaN(initialVisits)) {
    ancHFVisits += parseInt(initialVisits, 10);
  }

  const pregnancyFollowUps = getSubsequentPregnancyFollowUps(allReports, pregnancyReport);
  ancHFVisits += pregnancyFollowUps.reduce((sum, report) => {
    const pastANCHFVisits = getField(report, 'anc_visits_hf.anc_visits_hf_past');

    if (!pastANCHFVisits) {
      return sum;
    }

    if (pastANCHFVisits.last_visit_attended === 'yes') {
      sum += 1;
    }

    const otherVisitCount = pastANCHFVisits.visited_hf_count;
    if (pastANCHFVisits.report_other_visits === 'yes' && !isNaN(otherVisitCount)) {
      sum += parseInt(otherVisitCount, 10);
    }

    return sum;
  }, 0);

  return ancHFVisits;
};

const knowsHIVStatusInPast3Months = (allReports) => {
  const pregnancyFormsIn3Months = getFormArraySubmittedInWindow(
    allReports,
    pregnancyForms,
    today.clone().subtract(3, 'months'),
    today
  );

  return pregnancyFormsIn3Months.some(
    (report) => getField(report, 'pregnancy_new_or_current.hiv_status.hiv_status_know') === 'yes'
  );
};

const addImmunizations = (master, vaccinesReceived) => {
  IMMUNIZATION_DOSES.forEach((dose) => {
    if (!master[dose[0]]) {
      master[dose[0]] = typeof vaccinesReceived === 'string'
        ? vaccinesReceived.toUpperCase() === dose[1]
        : vaccinesReceived[`received_${dose[0]}`] === 'yes';
    }
  });
};

const getAgeInMonths = () => {
  // eslint-disable-next-line no-undef
  if (contact.date_of_birth && contact.date_of_birth !== '') {
    // eslint-disable-next-line no-undef
    const birthDate = new Date(contact.date_of_birth);
    const ageInMs = new Date(Date.now() - birthDate.getTime());
    return (Math.abs(ageInMs.getFullYear() - 1970) * 12) + ageInMs.getMonth();
  }
  return null;
};

const initImmunizations = () => {
  const master = {};
  IMMUNIZATION_DOSES.forEach((dose) => {
    master[dose[0]] = false;
  });
  return master;
};

const isSingleDose = (name) => IMMUNIZATION_DOSES.some((d) => d[0] === name);

const count = (arr, fn) => arr.filter(fn).length;

const countDosesReceived = (master, name) => {
  return count(IMMUNIZATION_DOSES, (dose) => {
    return master[dose[0]] && dose[0].startsWith(name + '_');
  });
};

const countDosesPossible = name => count(IMMUNIZATION_DOSES, dose => dose[0].startsWith(name + '_'));

const countReportsSubmittedInWindow = (form, end) => {
  // eslint-disable-next-line no-undef
  return count(reports, (r) => {
    return r.reported_date <= end && form.includes(r.form);
  });
};

module.exports = {
  today,
  MAX_DAYS_IN_PREGNANCY,
  IMMUNIZATION_LIST,
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
  getRiskFactorsFromPregnancy,
  now,
  addImmunizations,
  getAgeInMonths,
  initImmunizations,
  isSingleDose,
  countDosesReceived,
  countDosesPossible,
  countReportsSubmittedInWindow,
  immunizationForms,
};
