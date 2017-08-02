var cards = [];
var context = {};
var fields = [];

var MAX_DAYS_IN_PREGNANCY = 44*7;  // 44 weeks

var IMMUNIZATION_DOSES = [
  'bcg',
  'cholera_1',
  'cholera_2',
  'cholera_3',
  'hep_a_1',
  'hep_a_2',
  'hpv_1',
  'hpv_2',
  'hpv_3',
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
 
var initImmunizations = function() {
  var master = {};
  IMMUNIZATION_DOSES.forEach(function(dose) {
    master[dose] = false;
  });
  return master;
};
 
var addImmunizations = function(master, vaccines_received) {
  IMMUNIZATION_DOSES.forEach(function(dose) {
    master[dose] = master[dose] || ( vaccines_received['received_' + dose] == 'yes' );
  });
};

var countDosesReceived = function(master, name) {
  var count = 0;
  IMMUNIZATION_DOSES.forEach(function(dose) {
    if (master[dose] && dose.indexOf(name + '_') === 0) { 
      count++;
    }
  });
  return count;
};

var countDosesPossible = function(name) {
  var count = 0;
  IMMUNIZATION_DOSES.forEach(function(dose) {
    if (dose.indexOf(name + '_') === 0) {
      count++;
    }
  });
  return count;
};

var isSingleDose = function(name) {
  // Single doses wont be followed by an underscore in the list of doses
  var singleDose = true;
  IMMUNIZATION_DOSES.forEach(function(dose) {
    if (dose.indexOf(name + '_') === 0) { 
      singleDose = false;
    }
  });
  return singleDose;
};

// from nootils.js: https://github.com/medic/medic-webapp/blob/1cc25f2aeab60258065329bd1365ee1d316a1f50/static/js/modules/nootils.js
var isFormSubmittedInWindow = function(reports, form, start, end, count) {
  var result = false;
  reports.forEach(function(report) {
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
};

// from nootils.js: https://github.com/medic/medic-webapp/blob/1cc25f2aeab60258065329bd1365ee1d316a1f50/static/js/modules/nootils.js
var addDate = function(date, days) {
  var result;
  if (date) {
    result = new Date(date.getTime());
  } else {
    result = new Date();
  }
  result.setUTCDate(result.getUTCDate() + days);
  result.setUTCHours(0, 0, 0, 0);
  return result;
};

// Opposite of the following, with no form arg: https://github.com/medic/medic-webapp/blob/31762050095dd775941d1db3a2fc6f6b633522f3/static/js/modules/nootils.js#L37-L47
var getOldestReport = function(reports) {
  var result = null;
  reports.forEach(function(report) {
    if (!result || report.reported_date < result.reported_date) {
      result = report;
    }
  });
  return result;
};

if (contact.type === 'person') {
  fields = [
    { label: 'patient_id', value: contact.patient_id, width: 4 },
    { label: 'contact.age', value: contact.date_of_birth, width: 4, filter: 'age' },
    { label: 'Phone Number', value: contact.phone, width: 4, filter: 'phone' },
    { label: 'Notes', value: contact.notes, width: 12 },
    { label: 'contact.parent', value: contact.parent, filter: 'lineage' }
  ];
  var pregnancy;
  var pregnancyDate;
  var pastPregnancies = { label: 'contact.profile.past_pregnancies', fields: [] };
  
  var immunizations = initImmunizations();

  reports.forEach(function(report) {
    if (report.form === 'pregnancy' || report.form === 'P') {
      var subsequentDeliveries = reports.filter(function(report2) {
        return (report2.form === 'delivery' || report2.form === 'D') && report2.reported_date > report.reported_date;
      });
      
      // Handle past pregnancies
      if (subsequentDeliveries.length > 0) {
        var relevantDelivery = getOldestReport(subsequentDeliveries);
        var relevantVisits = reports.filter(function(report2) {
          return (report2.form === 'V' || report2.form === 'pregnancy_visit') && report2.reported_date > report.reported_date && report2.reported_date < relevantDelivery.reported_date;
        });
        
        var birthdate = relevantDelivery.birth_date || relevantDelivery.fields.birth_date || relevantDelivery.reported_date;
        // High risk status for previous pregnancies is temporarily unused
        // var isHighRiskPregnancy = (report.form === 'pregnancy' && report.fields && (report.fields.risk_factors || report.fields.danger_signs))
        //      || isFormSubmittedInWindow(reports, 'F', report.reported_date, relevantDelivery.reported_date);

        var deliveryCode = (relevantDelivery.fields.group_note && relevantDelivery.fields.group_note.default_chw_sms) || relevantDelivery.fields.delivery_code || 'unknown';
        
        // no need to distinguish the prefix `anc_only_`, so remove it
        deliveryCode = deliveryCode.replace('anc_only_', '').toLowerCase();
        
        pastPregnancies.fields.push(
          { label: 'contact.profile.delivery_code.' + deliveryCode, value: birthdate, filter: 'relativeDay', width: 6 },
          { label: 'contact.profile.visit', value: 'contact.profile.visits.of', translate: true, context: { count: relevantVisits.length, total: 4 }, width: 6 }
        );
        return;
      }
      
      // Handle current pregnancy
      var subsequentVisits = reports.filter(function(report2) {
        return (report2.form === 'pregnancy_visit' || report2.form === 'V') && report2.reported_date > report.reported_date;
      });
      context.pregnant = true; // don't show Create Pregnancy Report button
            
      var edd = report.expected_date || report.fields.edd_8601;
      
      // Pregnancy is high risk:
      // - if `pregnancy` form was used and has risk factors or danger signs in report
      // - if any Flag reports were submitted during time of pregnancy
      // It is ok to check past the delivery date because that only current pregancy info will be shown
      var isHighRiskPregnancy = (report.form === 'pregnancy' && report.fields && (report.fields.risk_factors || report.fields.danger_signs))
        || isFormSubmittedInWindow(reports, 'F', report.reported_date, addDate(new Date(report.reported_date), MAX_DAYS_IN_PREGNANCY).getTime());

      if (!pregnancy || pregnancyDate < report.reported_date) {
        pregnancyDate = report.reported_date;
        pregnancy = {
          label: 'contact.profile.pregnancy',
          fields: [
            { label: 'contact.profile.edd', value: edd, filter: 'relativeDay', width: 12 },
            { label: 'contact.profile.visit', value: 'contact.profile.visits.of', translate: true, context: { count: subsequentVisits.length, total: 4 }, width: 6 },
            { label: 'contact.profile.risk.title', value: isHighRiskPregnancy ? 'contact.profile.risk.high':'contact.profile.risk.normal', translate: true, width: 5},
            { label: '', value: isHighRiskPregnancy ? 'risk':'', filter: 'resourceIcon', width: 1}
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
  });
  if (pregnancy) {
    cards.push(pregnancy);
  }
  if (pastPregnancies.fields.length > 0) {
    cards.push(pastPregnancies);
  }
  if (isCoveredByUseCase(contact, "imm")) {
    var imm_card = {
      label: 'contact.profile.immunizations',
      fields: []
    };

    IMMUNIZATION_LIST.forEach( function(imm) {
      var field = {};
      field.label = 'contact.profile.imm.' + imm;
      field.translate = true;
      field.width = 6;
      if (isSingleDose(imm)) {
        field.value = immunizations[imm] ? 'yes' : 'no';
      }
      else {
        field.value= 'contact.profile.imm.doses';
        field.context = {};
        field.context.count = countDosesReceived(immunizations, imm);
        field.context.total = countDosesPossible(imm);
      }
      imm_card.fields.push(field);
    });
    cards.push(imm_card);
  }
} else {
  fields = [
    { label: 'Notes', value: contact.notes, width: 12 }
  ];
  if (contact.parent) {
    fields.push({ label: 'contact.parent', value: contact.parent, filter: 'lineage' });
  }
}

var result = {
  fields: fields,
  cards: cards,
  context: context
};
return result; // output on the last line of the configuration