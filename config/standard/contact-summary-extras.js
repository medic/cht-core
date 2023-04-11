var now = Date.now();

var pregnancyForms = [
  'P',
  'pregnancy'
];

var antenatalForms = [
  'V',
  'pregnancy_visit'
];

var deliveryForms = [
  'D',
  'delivery'
];

var postnatalForms = [
  'M',
  'postnatal_visit'
];

var immunizationForms = [
  'IMM',
  'C_IMM',
  'immunization_visit',
  'PENTA1',
  'PENTA2',
  'PENTA3',
  'BCG',
  'OPV0',
  'OPV1',
  'OPV2',
  'OPV3',
  'IPV1',
  'IPV2',
  'IPV3',
  'FIPV1',
  'FIPV2',
  'PCV1',
  'PCV2',
  'PCV3',
  'PCV4',
  'ROTA1',
  'ROTA2',
  'ROTA3',
  'VITA',
  'MMR1',
  'MMR2',
  'MMRV1',
  'MMRV2',
  'MN1',
  'MN2',
  'MN3',
  'MN4',
  'FLU',
  'HA1',
  'HA2',
  'HB',
  'JE',
  'YF',
  'TY1',
  'TY2',
  'HPV1',
  'HPV2',
  'HPV3',
  'CH1',
  'CH2',
  'CH3',
  'DPT4',
  'DPT5'
];

var MS_IN_DAY = 24*60*60*1000;  // 1 day in ms
var MAX_DAYS_IN_PREGNANCY = 44*7;  // 44 weeks
var DAYS_IN_PNC = 45; // Allow for 3 extra days to receive PNC reports

var IMMUNIZATION_DOSES = [
  ['bcg', 'BCG'],
  ['cholera_1', 'CH1'],
  ['cholera_2', 'CH2'],
  ['cholera_3', 'CH3'],
  ['hep_a_1', 'HA1'],
  ['hep_a_2', 'HA2'],
  ['hep_b', 'HB'],
  ['hpv_1', 'HPV1'],
  ['hpv_2', 'HPV2'],
  ['hpv_3', 'HPV3'],
  ['ipv_1', 'IPV1'],
  ['ipv_2', 'IPV2'],
  ['ipv_3', 'IPV3'],
  ['fipv_1', 'FIPV1'],
  ['fipv_2', 'FIPV2'],
  ['flu', 'FLU'],
  ['jap_enc', 'JE'],
  ['meningococcal_1', 'MN1'],
  ['meningococcal_2', 'MN2'],
  ['meningococcal_3', 'MN3'],
  ['meningococcal_4', 'MN4'],
  ['mmr_1', 'MMR1'],
  ['mmr_2', 'MMR2'],
  ['mmrv_1', 'MMRV1'],
  ['mmrv_2', 'MMRV2'],
  ['polio_0', 'OPV0'],
  ['polio_1', 'OPV1'],
  ['polio_2', 'OPV2'],
  ['polio_3', 'OPV3'],
  ['penta_1', 'PENTA1'],
  ['penta_2', 'PENTA2'],
  ['penta_3', 'PENTA3'],
  ['pneumococcal_1', 'PCV1'],
  ['pneumococcal_2', 'PCV2'],
  ['pneumococcal_3', 'PCV3'],
  ['pneumococcal_4', 'PCV4'],
  ['rotavirus_1', 'ROTA1'],
  ['rotavirus_2', 'ROTA2'],
  ['rotavirus_3', 'ROTA3'],
  ['typhoid_1', 'TY1'],
  ['typhoid_2', 'TY2'],
  ['vitamin_a', 'VITA'],
  ['yellow_fever', 'YF'],
  ['dpt_4', 'DPT4'],
  ['dpt_5', 'DPT5']
];

var IMMUNIZATION_LIST = [
  'bcg',
  'cholera',
  'hep_a',
  'hep_b',
  'hpv',
  'ipv',
  'fipv',
  'flu',
  'jap_enc',
  'meningococcal',
  'mmr',
  'mmrv',
  'polio',
  'penta',
  'pneumococcal',
  'rotavirus',
  'typhoid',
  'vitamin_a',
  'yellow_fever',
  'dpt'
];

function isReportValid(report) {
  return report && !(report.errors && report.errors.length);
}

function count(arr, fn) {
  var c = 0;
  for(var i=0; i<arr.length; ++i) {
    if(fn(arr[i])) { ++c; }
  }
  return c;
}

var isVaccineInLineage = function(lineage, vaccine) {
  return lineage && lineage.some(function(c) {
    return c && contains(c.vaccines, vaccine);
  });
};

var isCoveredByUseCaseInLineage = function(lineage, usecase) {
  return lineage && lineage.some(function(c) {
    return c && contains(c.use_cases, usecase);
  });
};

function contains(str, v) {
  return str && str.split(' ').indexOf(v) !== -1;
}

// This function is now broken. Since #2635 the parent does not have the fields populated.
// Use isCoveredByUseCaseInLineage() instead until contact is hydrated
var isCoveredByUseCase = function(contact, usecase) {
  return contact &&
      (contains(contact.use_cases, usecase) ||
          isCoveredByUseCase(contact.parent, usecase));
};

var isFacilityDelivery = function(r) {
  return r &&
         r.fields &&
         r.fields.delivery_code &&
         r.fields.delivery_code.toLowerCase() === 'f';
};

function isNonFacilityDelivery(r) {
  return r &&
         deliveryForms.indexOf(r.form) &&
         r.fields &&
         r.fields.delivery_code &&
         r.fields.delivery_code.toLowerCase() !== 'f';
}

function getBirthDate(r) {
  var rawDate = r &&
      (r.birth_date || r.fields.birth_date || r.reported_date);
  return new Date(rawDate);
}

function getPNCperiod(deliveryReport) {
  // Find PNC period based on delivery date, not reported date
  var start = getBirthDate(deliveryReport);
  return {
    start: start,
    end: addDate(start, DAYS_IN_PNC),
  };
}

var isHighRiskPregnancy = function(pregnancy) {
  // Pregnancy is high risk:
  // - if `pregnancy` form was used and has risk factors or danger signs in report
  // - if any Flag reports were submitted during time of pregnancy
  // - if a pregnancy_visit was submitted during the pregnancy with danger sign
  return (pregnancy.form === 'pregnancy' && pregnancy.fields && (pregnancy.fields.risk_factors || pregnancy.fields.danger_signs)) ||
    reports.some(function (r) {
      return isReportValid(r) &&
        r.reported_date > pregnancy.reported_date &&
        r.reported_date <= addDate(pregnancy.reported_date, MAX_DAYS_IN_PREGNANCY).getTime() &&
        (r.form.toUpperCase() === 'F' ||
          (r.form === 'pregnancy_visit' && r.fields && r.fields.danger_signs));
    });
};

function isHighRiskPostnatal(period) {
  // High risk postnatal period if:
  //  - Delivery is not at facility
  //  - F report in PNC period
  //  - postnatal_visit with danger sign for mom or baby
  return period &&
         period.start &&
         period.end &&
         reports.some(function(r) {
           return isReportValid(r) &&
              (isNonFacilityDelivery(r) ||
                (r.form.toUpperCase() === 'F' && r.reported_date >= period.end.getTime() && r.reported_date <= period.end.getTime()) ||
                (r.form === 'postnatal_visit' && r.fields && (r.fields.danger_signs_mom || r.fields.danger_signs_baby)));
         });
}

var getDeliveryCode = function(report) {
  var code = ((report && report.fields) && ((report.fields.group_note && report.fields.group_note.default_chw_sms) || report.fields.delivery_code)) || 'unknown';

  // no need to distinguish the prefix `anc_only_`, so remove it if it is there
  return code.toLowerCase().replace('anc_only_', '');
};

var initImmunizations = function() {
  var master = {};
  IMMUNIZATION_DOSES.forEach(function(dose) {
    master[dose[0]] = false;
  });
  return master;
};

var addImmunizations = function(master, vaccines_received) {
  IMMUNIZATION_DOSES.forEach(function(dose) {
    if(!master[dose[0]]) {
      master[dose[0]] = typeof vaccines_received === 'string' ?
          vaccines_received.toUpperCase() === dose[1] :
          vaccines_received['received_' + dose[0]] === 'yes';
    }
  });
};

var countDosesReceived = function(master, name) {
  return count(IMMUNIZATION_DOSES, function(dose) {
    return master[dose[0]] && dose[0].indexOf(name + '_') === 0;
  });
};

function countDosesPossible(name) {
  return count(IMMUNIZATION_DOSES, function(dose) {
    return dose[0].indexOf(name + '_') === 0;
  });
}

var isSingleDose = function(name) {
  // Single doses wont be followed by an underscore in the list of doses
  return IMMUNIZATION_DOSES.some(function(d) {
    return d[0] === name;
  });
};

// from rules.nools.js https://github.com/medic/medic-projects/blob/4dafaeed547ea61d362662f136e1e1f7c7335e9c/standard/rules.nools.js#L219-L229
// modified to exclude invalid reports, which is common with SMS reports
function countReportsSubmittedInWindow(form, end) {
  return count(reports, function(r) {
    return r.reported_date <= end && form.indexOf(r.form) !== -1;
  });
}

// // from nootils.js: https://github.com/medic/medic/blob/1cc25f2aeab60258065329bd1365ee1d316a1f50/static/js/modules/nootils.js
// // TODO: since this was refactored, before deleting we should consider updating at the source https://github.com/medic/medic-nootils/blob/48e92ed3e9a137dc87ff28c3efde04d59cfce39d/src/web/nootils.js#L49
// function isFormSubmittedInWindow(form, start, end, count) {
//   return reports.some(function(r) {
//     return r.form === form &&
//            r.reported_date >= start &&
//            r.reported_date <= end &&
//            (!count ||
//               (r.fields && r.fields.follow_up_count > count));
//   });
// }

// from nootils.js: https://github.com/medic/medic/blob/1cc25f2aeab60258065329bd1365ee1d316a1f50/static/js/modules/nootils.js
function addDate(date, days) {
  var result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

// Opposite of the following, with no form arg: https://github.com/medic/medic/blob/31762050095dd775941d1db3a2fc6f6b633522f3/static/js/modules/nootils.js#L37-L47
var getOldestReport = function(reports) {
  var result;
  reports.forEach(function(report) {
    if (!isReportValid(report)) { return; }
    if (!result || report.reported_date < result.reported_date) {
      result = report;
    }
  });
  return result;
};

function isActivePregnancy(r) {
  return contact.type === 'person' &&
      (r.form === 'P' || r.form === 'pregnancy') &&
      !getSubsequentDeliveries(r).length &&
      !getSubsequentPregnancies(r).length;
}

// function isInactivePregnancy(r) {
//   return (r.form === 'P' || r.form === 'pregnancy') &&
//       getSubsequentDeliveries(r).length;
// }

function getSubsequentDeliveries(report) {
  return reports.filter(function(r) {
    return (r.form === 'delivery' || r.form === 'D') && r.reported_date > report.reported_date;
  });
}

function getSubsequentPregnancies(report) {
  return reports.filter(function(r) {
    return pregnancyForms.indexOf(r.form) >= 0 && r.reported_date > report.reported_date;
  });
}

function getAgeInMonths() {
  var birthDate, ageInMs;
  if (contact.date_of_birth && contact.date_of_birth !== '') {
    birthDate = new Date(contact.date_of_birth);
    ageInMs = new Date(Date.now() - birthDate.getTime());
    return (Math.abs(ageInMs.getFullYear() - 1970) * 12) + ageInMs.getMonth();
  }
}

function getNewestDelivery() {
  if (contact.type !== 'person') { return; }

  var newestDelivery;

  reports.forEach(function(report) {
    if (!isReportValid(report)) { return; }
    if (report.form === 'D' || report.form === 'delivery') {
      // track newest delivery report to know if person is in PNC period
      if (!newestDelivery || (report.fields && newestDelivery.fields && report.fields.date_of_birth > newestDelivery.fields.date_of_birth)) {
        newestDelivery = report;
      }
    }
  });

  return newestDelivery;
}

function getNewestPncPeriod() {
  return getPNCperiod(getNewestDelivery());
}

function getSubsequentVisits(r) {
  var subsequentVisits = reports.filter(function(v) {
    return ((v.form === 'pregnancy_visit' && v.fields.visit_confirmed && v.fields.visit_confirmed === 'yes') || v.form === 'V') && v.reported_date > r.reported_date;
  });
  return subsequentVisits;
}

function getMostRecentNutritionEnrollment(){
  // returns the most recent enrollment report and a corresponding exit report that was submitted after enrollment
  var nutrition_reports = {
    enrollment: null,
    exit: null
  };
  var exits = [];
  reports.forEach(function(r) {
    if (r.form === 'nutrition_screening' &&
        !r.deleted &&
        (!nutrition_reports.enrollment || (r.reported_date > nutrition_reports.enrollment.reported_date && r.fields.treatment.enroll === 'yes'))) {
      nutrition_reports.enrollment = r;
    }
    // note any exit reports we may find for active enrollment verification
    if (r.form === 'nutrition_exit'){
      exits.push(r);
    }
  });

  // verify they haven't been exited after enrollment
  if (nutrition_reports.enrollment){
    nutrition_reports.exit = exits.find(function(r){
      return r.reported_date > nutrition_reports.enrollment.reported_date;
    });
  }
  return nutrition_reports;
}

function getTreatmentEnrollmentDate(){
  var date = '';
  var enrollment_report = getMostRecentNutritionEnrollment().enrollment;
  if (enrollment_report){
    var d = new Date(0);
    d.setUTCSeconds(enrollment_report.reported_date/1000);
    date = d.toISOString().slice(0, 10);
  }
  return date;
}

function getTreatmentProgram(){
  var treatment_program = '';
  var enrollment_report = getMostRecentNutritionEnrollment().enrollment;
  var exit_report = getMostRecentNutritionEnrollment().exit;
  if (enrollment_report && !exit_report) { treatment_program = enrollment_report.fields.treatment.program; }
  return treatment_program;
}

function countNutritionFollowups(){
  var count = 0;
  var enrollment = getMostRecentNutritionEnrollment().enrollment;
  // only count follow up visits after enrollment
  reports.forEach(function(r){
    if (r.form === 'nutrition_followup' && r.reported_date > enrollment.reported_date){
      count = count + 1;
    }
  });
  return count;
}

function getMostRecentReport(reports, form) {
  var result = null;
  reports.forEach(function(r) {
    if (form.indexOf(r.form) >= 0 &&
        !r.deleted &&
        (!result || r.reported_date > result.reported_date)) {
      result = r;
    }
  });
  return result;
}

module.exports = {
  now,
  pregnancyForms,
  antenatalForms,
  deliveryForms,
  postnatalForms,
  immunizationForms,
  MS_IN_DAY,
  MAX_DAYS_IN_PREGNANCY,
  DAYS_IN_PNC,
  IMMUNIZATION_DOSES,
  IMMUNIZATION_LIST,
  count,
  isVaccineInLineage,
  isCoveredByUseCaseInLineage,
  contains,
  isCoveredByUseCase,
  isFacilityDelivery,
  isNonFacilityDelivery,
  getBirthDate,
  isReportValid,
  getPNCperiod,
  isHighRiskPregnancy,
  isHighRiskPostnatal,
  getDeliveryCode,
  initImmunizations,
  addImmunizations,
  countDosesReceived,
  countDosesPossible,
  isSingleDose,
  countReportsSubmittedInWindow,
  addDate,
  getOldestReport,
  isActivePregnancy,
  getSubsequentDeliveries,
  getSubsequentPregnancies,
  getAgeInMonths,
  getNewestDelivery,
  getNewestPncPeriod,
  getSubsequentVisits,
  getTreatmentEnrollmentDate,
  getTreatmentProgram,
  countNutritionFollowups,
  getMostRecentReport,
  getMostRecentNutritionEnrollment,
};
