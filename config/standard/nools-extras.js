const now = new Date();

// FIXME this file should be renamed, as it also contains constants
var MS_IN_DAY = 24*60*60*1000;  // 1 day in ms
var MAX_DAYS_IN_PREGNANCY = 44*7;  // 44 weeks
var DAYS_IN_PNC = 42;

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
  'BCG',
  'OPV0',
  'OPV1',
  'OPV2',
  'OPV3',
  'IPV1',
  'IPV2',
  'IPV3',
  'PCV1',
  'PCV2',
  'PCV3',
  'PCV4',
  'PENTA1',
  'PENTA2',
  'PENTA3',
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
  'JE',
  'YF',
  'TY1',
  'TY2',
  'HPV1',
  'HPV2',
  'HPV3',
  'CH1',
  'CH2',
  'CH3'
];

var immunizations = [
  'bcg',
  'cholera_1',
  'cholera_2',
  'cholera_3',
  'hep_a_1',
  'hep_a_2',
  'hpv_1',
  'hpv_2',
  'hpv_3',
  'ipv_1',
  'ipv_2',
  'ipv_3',
  'flu',
  'jap_enc',
  'meningococcal_1',
  'meningococcal_2',
  'meningococcal_3',
  'meningococcal_4',
  'mmr_1',
  'mmr_2',
  'mmrv_1',
  'mmrv_2',
  'polio_0',
  'polio_1',
  'polio_2',
  'polio_3',
  'penta_1',
  'penta_2',
  'penta_3',
  'pneumococcal_1',
  'pneumococcal_2',
  'pneumococcal_3',
  'pneumococcal_4',
  'rotavirus_1',
  'rotavirus_2',
  'rotavirus_3',
  'typhoid_1',
  'typhoid_2',
  'vitamin_a',
  'yellow_fever'
];

var immunizationMonths = [1, 2, 3, 6, 8, 12, 16, 24];

// This is identical to the ones in nootils, but `form` can be an array. This needs to be ported to nootils.
// TODO shared with contact-summary?
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

function isFormFromArraySubmittedInWindow(reports, formsArray, startTime, endTime) {
  if(typeof formsArray === 'string') { 
    formsArray = [ formsArray ];
  }
  return formsArray.some(function(f) {
    return Utils.isFormSubmittedInWindow(reports, f, startTime, endTime);
  });
}

function isCoveredByUseCase(contact, usecase) {
  // The use case should only be set at the health_center level, but allow checking throughout the lineage.
  // A facility can override a parent's use case setting, but not the other way around.
  // If no use_case is set in lineage they are covered by default.
  if (!contact) {
    return true;
  } else if (typeof contact.use_cases === 'string') {
    return (contact.use_cases.split(' ').indexOf(usecase) !== -1);
  } else {
    return isCoveredByUseCase(contact.parent, usecase);
  }
}

function isHighRiskPregnancy(c, r) {
  // Pregnancy is high risk:
  // - if `pregnancy` form was used and has risk factors or danger signs in report
  // - if any Flag reports were submitted during time of pregnancy
  // It is ok to check past the delivery date because those tasks would be cleared anyhow
  return (r.form === 'pregnancy' &&
              r.fields && (r.fields.risk_factors || r.fields.danger_signs)) ||
        Utils.isFormSubmittedInWindow(c.reports, 'F',
            r.reported_date,
            Utils.addDate(new Date(r.reported_date), MAX_DAYS_IN_PREGNANCY).getTime());
}

function isHomeBirth(r) {
  return r.fields &&
         r.fields.delivery_code &&
         r.fields.delivery_code.toUpperCase() !== 'F';
}

function getNewestPregnancyTimestamp(c) {
  return Math.max(
      Utils.getMostRecentTimestamp(c.reports, 'P'),
      Utils.getMostRecentTimestamp(c.reports, 'pregnancy'));
}

function getNewestDeliveryTimestamp(c) {
  var newestDelivery = getMostRecentReport(c.reports, deliveryForms);
  return newestDelivery ? newestDelivery.reported_date : 0;
}

function isNewestPregnancy(c, r) {
  if(!(r.form === 'P' || r.form === 'pregnancy')) {
    return;
  }

  return r.reported_date === getNewestPregnancyTimestamp(c);
}

function isHealthyDelivery(c, r) {
  return r.form === 'D' ||
      (r.form === 'delivery' && r.fields.pregnancy_outcome === 'healthy');
}

function isWomanInActivePncPeriod(c) {
  // The PNC period ending today started 6 weeks ago, rounded down to midnight
  var startPNCperiod = new Date(now.getFullYear(), now.getMonth(), now.getDate() - DAYS_IN_PNC);

  return getNewestDeliveryTimestamp(c) > startPNCperiod.getTime();
}

function isChildUnder5(c) {
  var birthDate = new Date(c.contact.date_of_birth);
  var ageInMs = new Date(now - birthDate.getTime());
  var ageInMonths = (Math.abs(ageInMs.getFullYear() - 1970) * 12) + ageInMs.getMonth();
  return ageInMonths < 60;
}

// This was identical to the ones in nootils, but now `form` can be an array, and can count for number of forms in the window. This needs to be ported to nootils.
function isFormSubmittedInWindow(reports, form, start, end, count) {
  var result = false;
  var reportsFound = 0;
  reports.forEach(function(r) {
    if (!result && form.indexOf(r.form) >= 0) {
      if (r.reported_date >= start && r.reported_date <= end) {
        reportsFound++;
        if (!count ||
            (r.fields && r.fields.follow_up_count > count) ||
            (reportsFound >= count) ) {
          result = true;
        }
      }
    }
  });
  return result;
}

function countReportsSubmittedInWindow(reports, form, start, end) {
  var reportsFound = 0;
  reports.forEach(function(r) {
    if (form.indexOf(r.form) >= 0) {
      if (r.reported_date >= start && r.reported_date <= end) {
        reportsFound++;
      }
    }
  });
  return reportsFound;
}

function countANCVisits(reports, start, end){
  var reportsFound = 0;
  reports.forEach(function(r) {
    if (antenatalForms.indexOf(r.form) >= 0) {
      if (r.reported_date >= start && r.reported_date <= end) {
        if ((r.form === 'pregnancy_visit' && r.fields.visit_confirmed === 'yes') || r.form === 'V'){
          reportsFound++;
        }
      }
    }
  });
  return reportsFound;
}

// From medic-sentinel/lib/utils.js
function isFormCodeSame(formCode, test) {
  return formCode &&
         formCode.trim().toLowerCase() === test;
}

function isFacilityDelivery(c, r) {
  if(arguments.length === 1) {
    r = c;
  }
  
  return r.fields &&
         r.fields.delivery_code &&
         r.fields.delivery_code.toUpperCase() === 'F';
}

function receivedVaccine(r, vaccine) {
  var fieldName = 'received_' + vaccine;
  return isFormCodeSame(r.form, vaccine) ||
      (isFormCodeSame(r.form, 'immunization_visit') &&
          r.fields.vaccines_received &&
          r.fields.vaccines_received[fieldName] === 'yes') ||
      (isFormCodeSame(r.form, 'imm') &&
          r.fields.vaccines_received &&
          r.fields.vaccines_received[fieldName] === 'yes');
}

function isBcgReported(c) {
  return c.reports
      .some(function(r) {
         return receivedVaccine(r, 'bcg');
       });
}

function countDoses(r) {
  var dosesGiven = 0;
  immunizations.forEach(function(i) {
    var vaccineDose = 'received_' + i;
    if(r.fields.vaccines_received[vaccineDose] === 'yes') {
      dosesGiven++;
    }
  });
  return dosesGiven;
}

module.exports = {
  MS_IN_DAY,
  MAX_DAYS_IN_PREGNANCY,
  DAYS_IN_PNC,
  antenatalForms,
  deliveryForms,
  postnatalForms,
  immunizationForms,
  immunizationMonths,
  now,
  getMostRecentReport,
  isFormFromArraySubmittedInWindow,
  isCoveredByUseCase,
  isHighRiskPregnancy,
  isHomeBirth,
  getNewestPregnancyTimestamp,
  getNewestDeliveryTimestamp,
  isNewestPregnancy,
  isHealthyDelivery,
  isWomanInActivePncPeriod,
  isChildUnder5,
  isFormSubmittedInWindow,
  countReportsSubmittedInWindow,
  countANCVisits,
  isFormCodeSame,
  isFacilityDelivery,
  receivedVaccine,
  isBcgReported,
  countDoses,
};
