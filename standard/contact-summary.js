var cards = [];
var context = {};
var fields = [];

var now = new Date();
var MS_IN_DAY = 24*60*60*1000;  // 1 day in ms
var MAX_DAYS_IN_PREGNANCY = 44*7;  // 44 weeks
var DAYS_IN_PNC = 45; // Allow for 3 extra days to receive PNC reports

var deliveryForms = [
  'D',
  'delivery'
];

var immunizationForms = [
  'V',
  'IMM',
  'immunization_visit',
  'DT1',
  'DT2',
  'DT3',
  'BCG',
  'OPV0',
  'OPV1',
  'OPV2',
  'OPV3',
  'PCV1',
  'PCV2',
  'PCV3',
  'RV1',
  'RV2',
  'RV3',
  'VA',
  'MTV1',
  'MTV2',
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
  'CH3',
  'RB1',
  'RB2',
  'RB3',
  'TBE'
];

var IMMUNIZATION_DOSES = [
  ['bcg','BCG'],
  ['cholera_1','CH1'],
  ['cholera_2','CH2'],
  ['cholera_3','CH3'],
  ['hep_a_1','HA1'],
  ['hep_a_2','HA2'],
  ['hpv_1','HPV1'],
  ['hpv_2','HPV2'],
  ['hpv_3','HPV3'],
  ['flu','FLU'],
  ['jap_enc','JE'],
  ['meningococcal_1','MN1'],
  ['meningococcal_2','MN2'],
  ['meningococcal_3','MN3'],
  ['meningococcal_4','MN4'],
  ['mmr_1','MMR1'],
  ['mmr_2','MMR2'],
  ['mmrv_1','MMRV1'],
  ['mmrv_2','MMRV2'],
  ['polio_0','OPV0'],
  ['polio_1','OPV1'],
  ['polio_2','OPV2'],
  ['polio_3','OPV3'],
  ['penta_1','PEN1'],
  ['penta_2','PEN2'],
  ['penta_3','PEN3'],
  ['pneumococcal_1','PCV1'],
  ['pneumococcal_2','PCV2'],
  ['pneumococcal_3','PCV3'],
  ['pneumococcal_4','PCV4'],
  ['rotavirus_1','RV1'],
  ['rotavirus_2','RV2'],
  ['rotavirus_3','RV3'],
  ['typhoid_1','TY1'],
  ['typhoid_2','TY2'],
  ['vitamin_a','VA'],
  ['yellow_fever','YF']
];

var IMMUNIZATION_LIST = [
  'bcg',
  'cholera',
  'hep_a',
  'hpv',
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
  'yellow_fever'
];

var isVaccineInLineage = function(lineage, vaccine) {
  if (Array.isArray(lineage)) {
    for (var i=0; i < lineage.length; i++) {
      if (lineage[i] && lineage[i].vaccines && lineage[i].vaccines.split(' ').indexOf(vaccine) !== -1) {
        return true;
      }
    }
  }
  return false;
};

var isCoveredByUseCaseInLineage = function(lineage, usecase) {
  if (Array.isArray(lineage)) {
    for (var i=0; i < lineage.length; i++) {
      if (lineage[i] && lineage[i].use_cases && lineage[i].use_cases.split(' ').indexOf(usecase) !== -1) {
        return true;
      }
    }
  }
  return false;
};

// This function is now broken. Since #2635 the parent does not have the fields populated.
// Use isCoveredByUseCaseInLineage() instead until contact is hydrated
var isCoveredByUseCase = function(contact, usecase) {

  if (!contact) {
    return false;
  }
  else if (contact && contact.parent && contact.parent.use_cases && contact.parent.use_cases.split(' ').indexOf(usecase) !== -1) {
    return true;
  }
  else {
    return isCoveredByUseCase(contact.parent, usecase);
  }
};

var isFacilityDelivery = function(report) {
  return report && report.fields && report.fields.delivery_code.toLowerCase() === 'f';
};

var isNonFacilityDelivery = function(report) {
  return report && deliveryForms.indexOf(report.form) && report.fields && report.fields.delivery_code && report.fields.delivery_code.toLowerCase() !== 'f';
};

var getBirthDate = function(report) {
  var rawDate = report && (report.birth_date || report.fields.birth_date || report.reported_date);
  return new Date(rawDate);
};

var getPNCperiod = function(deliveryReport){
  var obj = {};
  // Find PNC period based on delivery date, not reported date
  obj.start = getBirthDate(deliveryReport);
  obj.end = new Date(obj.start.getFullYear(), obj.start.getMonth(), obj.start.getDate() + DAYS_IN_PNC);
  return obj;
};
/*
var isInPNCPeriod = function(deliveryReport, start, end){
  if (deliveryReport && deliveryReport.fields) {
    var now = new Date();
    return now >= newestPNCperiod.start && now <= newestPNCperiod.end;
  }
  else {
    return false;
  }
};
*/

var isHighRiskPregnancy = function(reports, pregnancy) {
  // Pregnancy is high risk:
  // - if `pregnancy` form was used and has risk factors or danger signs in report
  // - if any Flag reports were submitted during time of pregnancy
  return (pregnancy.form === 'pregnancy' && pregnancy.fields && (pregnancy.fields.risk_factors || pregnancy.fields.danger_signs)) ||
        isFormSubmittedInWindow(reports, 'F', pregnancy.reported_date, addDate(new Date(pregnancy.reported_date), MAX_DAYS_IN_PREGNANCY).getTime());
};

var isHighRiskPostnatal = function (reports, period) {
  // High risk postnatal period if:
  //  - Delivery is not at facility
  //  - F report in PNC period
  //  - postnatal_visit with risk factor or danger sign
  var highRisk = false;
  if (period && period.start && period.end) {
    reports.forEach(function(report) {
      if (!isReportValid(report)) { return; }
      if (isNonFacilityDelivery(report) ||
          (report.form.toUpperCase() === 'F' && report.reported_date >= period.end.getTime() && report.reported_date <= period.end.getTime()) ||
          (report.form === 'postnatal_visit' && report.fields && (report.fields.risk_factors || report.fields.danger_signs))) {
        highRisk = true;
      }
    });
  }
  return highRisk;
};

var getDeliveryCode = function(report) {
  var code = ((report && report.fields) && ((report.fields.group_note && report.fields.group_note.default_chw_sms) || report.fields.delivery_code)) || 'unknown';

  // no need to distinguish the prefix `anc_only_`, so remove it if it is there
  code = code.replace('anc_only_', '').toLowerCase();
  return code;
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
    master[dose[0]] = master[dose[0]] || ( vaccines_received['received_' + dose[0]] === 'yes' ) || ( typeof(vaccines_received) === 'string' && vaccines_received.toUpperCase() === dose[1] );
  });
};

var countDosesReceived = function(master, name) {
  var count = 0;
  IMMUNIZATION_DOSES.forEach(function(dose) {
    if (master[dose[0]] && dose[0].indexOf(name + '_') === 0) {
      count++;
    }
  });
  return count;
};

var countDosesPossible = function(name) {
  var count = 0;
  IMMUNIZATION_DOSES.forEach(function(dose) {
    if (dose[0].indexOf(name + '_') === 0) {
      count++;
    }
  });
  return count;
};

var isSingleDose = function(name) {
  // Single doses wont be followed by an underscore in the list of doses
  var singleDose = true;
  IMMUNIZATION_DOSES.forEach(function(dose) {
    if (dose[0].indexOf(name + '_') === 0) {
      singleDose = false;
    }
  });
  return singleDose;
};

// from rules.nools.js https://github.com/medic/medic-projects/blob/4dafaeed547ea61d362662f136e1e1f7c7335e9c/standard/rules.nools.js#L219-L229
// modified to exclude invalid reports, which is common with SMS reports
var countReportsSubmittedInWindow = function(reports, form, start, end) {
  var reportsFound = 0;
  reports.forEach(function(report) {
    if (!isReportValid(report)) { return; }
    if (form.indexOf(report.form) >= 0) {
      if (report.reported_date >= start && report.reported_date <= end) {
        reportsFound++;
      }
    }
  });
  return reportsFound;
};

// from nootils.js: https://github.com/medic/medic-webapp/blob/1cc25f2aeab60258065329bd1365ee1d316a1f50/static/js/modules/nootils.js
// modified to exclude invalid reports, which is common with SMS reports
function isFormSubmittedInWindow(reports, form, start, end, count) {
  var result = false;
  reports.forEach(function(report) {
    if (!isReportValid(report)) { return; }
    if (!result && report.form === form) {
      if (report.reported_date >= start && report.reported_date <= end) {
        if (!count ||
           (count && report.fields && report.fields.follow_up_count > count)) {
          result = true;
        }
      }
    }
  });
  return result;
}

// from nootils.js: https://github.com/medic/medic-webapp/blob/1cc25f2aeab60258065329bd1365ee1d316a1f50/static/js/modules/nootils.js
function addDate(date, days) {
  var result;
  if (date) {
    result = new Date(date.getTime());
  } else {
    result = new Date();
  }
  result.setUTCDate(result.getUTCDate() + days);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

// Opposite of the following, with no form arg: https://github.com/medic/medic-webapp/blob/31762050095dd775941d1db3a2fc6f6b633522f3/static/js/modules/nootils.js#L37-L47
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

function isReportValid(report) {
  // valid XForms won't have `errors` field
  // valid JSON forms will have empty array `errors:[]`
  if (report && (!report.errors || (report.errors && report.errors.length === 0))) {
    return true;
  }
  else {
    return false;
  }
}

var use_cases = {};
use_cases.anc = isCoveredByUseCaseInLineage(lineage, 'anc');
use_cases.pnc = isCoveredByUseCaseInLineage(lineage, 'pnc');
use_cases.imm = isCoveredByUseCaseInLineage(lineage, 'imm');
context.use_cases = use_cases;

if (contact.type === 'person') {
  fields = [
    { label: 'patient_id', value: contact.patient_id, width: 4 },
    { label: 'contact.age', value: contact.date_of_birth, width: 4, filter: 'age' },
    { label: 'Phone Number', value: contact.phone, width: 4, filter: 'phone' },
    { label: 'Notes', value: contact.notes, width: 12 },
    { label: 'contact.parent', value: lineage, filter: 'lineage' }
  ];
  var pregnancy;
  var pregnancyDate;
  var pastPregnancies = { label: 'contact.profile.past_pregnancies', fields: [] };

  var immunizations = initImmunizations();

  // INIT
  var birthDate, ageInMs, ageInMonths, newestDelivery;

  if (contact.date_of_birth && contact.date_of_birth !== '') {
    birthDate = new Date(contact.date_of_birth);
    ageInMs = new Date(Date.now() - birthDate.getTime());
    ageInMonths = (Math.abs(ageInMs.getFullYear() - 1970) * 12) + ageInMs.getMonth();
  }

  reports.forEach(function(report) {
    if (!isReportValid(report)) { return; }
    if (report.form === 'pregnancy' || report.form === 'P') {
      var subsequentDeliveries = reports.filter(function(report2) {
        return (report2.form === 'delivery' || report2.form === 'D') && report2.reported_date > report.reported_date;
      });

      // HANDLE PAST PREGNANCIES
      if (subsequentDeliveries.length > 0) {
        var relevantDelivery = getOldestReport(subsequentDeliveries);
        var birthdate = getBirthDate(relevantDelivery);

        var relevantVisitsANC = reports.filter(function(report2) {
          return (report2.form === 'V' || report2.form === 'pregnancy_visit') && report2.reported_date > report.reported_date && report2.reported_date < birthdate.getTime();
        });
        var relevantVisitsPNC = reports.filter(function(report2) {
          return (report2.form === 'M' || report2.form === 'postnatal_visit') && report2.reported_date > birthdate.getTime() && report2.reported_date < (birthdate.getTime() + DAYS_IN_PNC*MS_IN_DAY);
        });

        var visitsANC = relevantVisitsANC.length;
        var visitsPNC = relevantVisitsPNC.length;

        if (isFacilityDelivery(relevantDelivery)) {
          visitsPNC++;
        }

        pastPregnancies.fields.push(
          { label: 'contact.profile.delivery_code.' + getDeliveryCode(relevantDelivery), value: birthdate, filter: 'relativeDay', width: 6 },
          { label: 'contact.profile.anc_visit', value: 'contact.profile.visits.of', translate: true, context: { count: visitsANC, total: 4 }, width: 3 }
        );
        if(use_cases.pnc){
          pastPregnancies.fields.push(
            { label: 'contact.profile.pnc_visit', value: 'contact.profile.visits.of', translate: true, context: { count: visitsPNC, total: 4 }, width: 3 }
          );
        }
        return;
      }

      // HANDLE CURRENT PREGNANCY
      var subsequentVisits = reports.filter(function(report2) {
        return (report2.form === 'pregnancy_visit' || report2.form === 'V') && report2.reported_date > report.reported_date;
      });
      context.pregnant = true; // don't show Create Pregnancy Report button

      var edd = report.expected_date || report.fields.edd_8601;

      var highRiskPregnancy = isHighRiskPregnancy(reports, report);

      if (!pregnancy || pregnancyDate < report.reported_date) {
        pregnancyDate = report.reported_date;
        pregnancy = {
          label: 'contact.profile.pregnancy',
          fields: [
            { label: 'contact.profile.edd', value: edd, filter: 'relativeDay', width: 12 },
            { label: 'contact.profile.visit', value: 'contact.profile.visits.of', translate: true, context: { count: subsequentVisits.length, total: 4 }, width: 6 },
            { label: 'contact.profile.risk.title', value: highRiskPregnancy ? 'contact.profile.risk.high':'contact.profile.risk.normal', translate: true, width: 5, icon: highRiskPregnancy ? 'risk':''}
          ]
        };
      }
    }
    else if (report.form === 'immunization_visit') {
      if (report && report.fields && report.fields.vaccines_received) {
        addImmunizations(immunizations, report.fields.vaccines_received);
      }
    }
    else if (report.form === 'IMM') {
      addImmunizations(immunizations, report.fields);
    }
    else if (report.form === 'D' || report.form === 'delivery') {
      // track newest delivery report to know if person is in PNC period
      if (!newestDelivery || (report.fields && newestDelivery.fields && report.fields.date_of_birth > newestDelivery.fields.date_of_birth)) {
        newestDelivery = report;
      }
    }
    else {
      addImmunizations(immunizations, report.form);
    }
  });

  var newestPNCperiod = getPNCperiod(newestDelivery);
  var birthdate = getBirthDate(newestDelivery);

  if (use_cases.pnc && now >= newestPNCperiod.start && now <= newestPNCperiod.end) {
    context.in_pnc_period = true;
    var highRiskPostnatal = isHighRiskPostnatal(reports, newestPNCperiod);
    var relevantVisitsPNC = reports.filter(function(report2) {
      // look for reports in the PNC period
      return (report2.form === 'M' || report2.form === 'postnatal_visit') && report2.reported_date > birthdate.getTime() && report2.reported_date < (birthdate.getTime() + DAYS_IN_PNC*MS_IN_DAY);
    });
    var visitsPNC = relevantVisitsPNC.length;
    if (isFacilityDelivery(newestDelivery)) {
      visitsPNC++;
    }

    var postnatal_card = {
      label: 'contact.profile.postnatal',
      fields: [
        { label: 'contact.profile.delivery_code.' + getDeliveryCode(newestDelivery), value: birthdate.getTime(), filter: 'relativeDay', width: 12 },
        { label: 'contact.profile.pnc_visit', value: 'contact.profile.visits.of', translate: true, context: { count: visitsPNC, total: 4 }, width: 6 },
        { label: 'contact.profile.risk.title', value: highRiskPostnatal ? 'contact.profile.risk.high':'contact.profile.risk.normal', translate: true, width: 5, icon: highRiskPostnatal ? 'risk':''}
      ]
    };
    cards.push(postnatal_card);
  }

  // Determine which condition cards to show
  if (pregnancy) {
    cards.push(pregnancy);
  }
  if (pastPregnancies.fields.length > 0) {
    cards.push(pastPregnancies);
  }
  if (typeof ageInMonths === 'number' && ageInMonths < 144 && use_cases.imm) {
    var imm_card = {
      label: 'contact.profile.immunizations',
      fields: []
    };

    IMMUNIZATION_LIST.forEach(function(imm) {
      if (isVaccineInLineage(lineage, imm)) {
        var field = {};
        field.label = 'contact.profile.imm.' + imm;
        field.translate = true;
        field.width = 6;
        if (isSingleDose(imm)) {
          field.value = immunizations[imm] ? 'yes' : 'no';
        }
        else {
          field.value = 'contact.profile.imm.doses';
          field.context = {};
          field.context.count = countDosesReceived(immunizations, imm);
          field.context.total = countDosesPossible(imm);
        }
        imm_card.fields.push(field);
      }
    });
    // Show a report count if no specific immunizations are being tracked
    if (!imm_card.fields.length) {
      imm_card.fields.push({
        label: 'contact.profile.imm.generic',
        translate: true,
        value: countReportsSubmittedInWindow(reports, immunizationForms, null, Date.now()),
        width: 12,
      });
    }
    cards.push(imm_card);
  }
} else {
  fields = [
    { label: 'Notes', value: contact.notes, width: 12 }
  ];
  if (contact.parent && lineage[0]) {
    fields.push({ label: 'contact.parent', value: lineage, filter: 'lineage' });
  }
}

// Added to ensure CHW info is pulled into forms accessed via tasks
if(lineage[0] && lineage[0].contact) {
  context.chw_name = lineage[0].contact.name;
  context.chw_phone = lineage[0].contact.phone;
}

var result = {
  fields: fields,
  cards: cards,
  context: context
};
// return the result for 2.13+ as per #2635
return result;
