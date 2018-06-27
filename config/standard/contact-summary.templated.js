context = {
  use_cases: {
    anc: isCoveredByUseCaseInLineage(lineage, 'anc'),
    pnc: isCoveredByUseCaseInLineage(lineage, 'pnc'),
    imm: isCoveredByUseCaseInLineage(lineage, 'imm'),
  },
};

fields = [
  { appliesToType:'person',  label:'patient_id', value:contact.patient_id, width: 4 },
  { appliesToType:'person',  label:'contact.age', value:contact.date_of_birth, width: 4, filter: 'age' },
  { appliesToType:'person',  label:'Phone Number', value:contact.phone, width: 4, filter: 'phone' },
  { appliesToType:'person',  label:'Notes', value:contact.notes, width: 12 },
  { appliesToType:'person',  label:'contact.parent', value:lineage, filter: 'lineage' },
  { appliesToType:'!person', label:'Notes', value:contact.notes, width:12 },
  { appliesToType:'!person', appliesIf:function() { return contact.parent && lineage[0]; }, label:'contact.parent', value:lineage, filter:'lineage' },
];

cards = [
  {
    label: 'contact.profile.pregnancy',
    appliesToType: 'report',
    appliesIf: isActivePregnancy,
    fields: [
      {
        label: 'contact.profile.edd',
        value: function(r) {
          var edd = r.expected_date || r.fields.edd_8601;
          return edd;
        },
        filter: 'relativeDay',
        width: 12
      },
      {
        label: 'contact.profile.visit',
        value: 'contact.profile.visits.of',
        translate: true,
        context: {
          count: function(r) { return getSubsequentVisits(r).length; },
          total: 4,
        },
        width: 6,
      },
      {
        label: 'contact.profile.risk.title',
        value: function(r) {
          return isHighRiskPregnancy(r) ? 'contact.profile.risk.high':'contact.profile.risk.normal';
        },
        translate: true,
        width: 5,
        icon: function(r) {
          return isHighRiskPregnancy(r) ? 'risk' : '';
        },
      },
    ],
    modifyContext: function(ctx) {
      ctx.pregnant = true; // don't show Create Pregnancy Report button
    },
  },

  {
    label: 'contact.profile.postnatal',
    appliesToType: 'person',
    appliesIf: function() {
      if(!context.use_cases.pnc) return;

      var newestPNCperiod = getNewestPncPeriod();

      return now >= newestPNCperiod.start &&
             now <= newestPNCperiod.end;
    },
    fields: [
      {
        label: function() {
          return 'contact.profile.delivery_code.' + getDeliveryCode(getNewestDelivery());
        },
        value: function() {
          var newestDelivery = getNewestDelivery();
          var birthdate = getBirthDate(newestDelivery);
          return birthdate.getTime();
        },
        filter: 'relativeDay',
        width: 12,
      },
      {
        label: 'contact.profile.pnc_visit',
        value: 'contact.profile.visits.of',
        translate: true,
        context: {
          count: function() {
            var newestDelivery = getNewestDelivery();
            var birthdate = getBirthDate(newestDelivery);
            var relevantVisitsPNC = reports.filter(function(r) {
              // look for reports in the PNC period
              // birthdate is set to 00:00 on delivery day, so add 1 day to end of PNC period
              return (r.form === 'M' || r.form === 'postnatal_visit') && r.reported_date > birthdate.getTime() && r.reported_date < (birthdate.getTime() + (DAYS_IN_PNC+1)*MS_IN_DAY);
            });
            var visitsPNC = relevantVisitsPNC.length;
            if (isFacilityDelivery(newestDelivery)) {
              visitsPNC++;
            }

            return visitsPNC;
          },
          total: 4,
        },
        width: 6,
      },
      {
        label: 'contact.profile.risk.title',
        value: function() {
          var newestPNCperiod = getNewestPncPeriod();
          var highRiskPostnatal = isHighRiskPostnatal(newestPNCperiod);

          return highRiskPostnatal ? 'contact.profile.risk.high':'contact.profile.risk.normal';
        },
        translate: true,
        width: 5,
        icon: function() {
          var newestPNCperiod = getNewestPncPeriod();
          var highRiskPostnatal = isHighRiskPostnatal(newestPNCperiod);

          return highRiskPostnatal ? 'risk' : '';
        },
      },
    ],
    modifyContext: function(ctx) {
      ctx.in_pnc_period = true;
    },
  },

// TODO should also take into account non-active pregnancies with no deliveries 
  {
    label: 'contact.profile.past_pregnancies',
    appliesToType: 'person',
    appliesIf: getNewestDelivery,
    fields: function () {
      var fields = [];
      var relevantDelivery, birthdate, relevantVisitsANC, relevantVisitsPNC, visitsANC, visitsPNC, subsequentDeliveries, subsequentPregnancies, nextPregnancy;
      reports.forEach(function (report) { 
        if (isReportValid(report) && pregnancyForms.indexOf(report.form) >= 0) {

          // Ignore pregnancies with no delivery report
          subsequentDeliveries = getSubsequentDeliveries(report);          
          if (subsequentDeliveries.length === 0) { return; }
          
          relevantDelivery = getOldestReport(subsequentDeliveries);
          birthdate = getBirthDate(relevantDelivery);

          // Ignore pregnancy reports that are superseded before delivery report
          subsequentPregnancies = getSubsequentPregnancies(report);
          nextPregnancy = getOldestReport(subsequentPregnancies);
          if (nextPregnancy && nextPregnancy.reported_date < relevantDelivery.reported_date) { return; }

          relevantVisitsANC = reports.filter(function (r) {
            // birthdate is set to 00:00 on delivery date, so check for visits up until the end of the birth day date
            return antenatalForms.indexOf(r.form) >= 0 && r.reported_date > report.reported_date && r.reported_date < (birthdate.getTime() + MS_IN_DAY);
          });
          relevantVisitsPNC = reports.filter(function (r) {
            // birthdate is set to 00:00 on delivery day, so add 1 day to end of PNC period
            return postnatalForms.indexOf(r.form) >= 0 && r.reported_date > birthdate.getTime() && r.reported_date < (birthdate.getTime() + (DAYS_IN_PNC+1)*MS_IN_DAY);
          });

          visitsANC = relevantVisitsANC.length;
          visitsPNC = relevantVisitsPNC.length;

          if (isFacilityDelivery(relevantDelivery)) {
            visitsPNC++;
          }

          fields.push(
            { label: 'contact.profile.delivery_code.' + getDeliveryCode(relevantDelivery), value: birthdate, filter: 'relativeDay', width: 6 },
            { label: 'contact.profile.anc_visit', value: 'contact.profile.visits.of', translate: true, context: { count: visitsANC, total: 4 }, width: 3 }
          );
          if (isCoveredByUseCaseInLineage(lineage, 'pnc')) {
            fields.push(
              { label: 'contact.profile.pnc_visit', value: 'contact.profile.visits.of', translate: true, context: { count: visitsPNC, total: 4 }, width: 3 }
            );
          }
        }
      });
      return fields;
    },
  },

  {
    label: 'contact.profile.immunizations',
    appliesToType: 'person',
    appliesIf: function() {
      return context.use_cases.imm && getAgeInMonths() < 144;
    },
    fields: function() {
      var i, report;
      var immunizations = initImmunizations();
      for(i=0; i<reports.length; ++i) {
        report = reports[i];
        if (report.form === 'immunization_visit') {
          if (report && report.fields && report.fields.vaccines_received) {
            addImmunizations(immunizations, report.fields.vaccines_received);
          }
        } else if (report.form === 'IMM') {
          addImmunizations(immunizations, report.fields);
        }  else {
          addImmunizations(immunizations, report.form);
        }
      }

      var fields = [];

      IMMUNIZATION_LIST.forEach(function(imm) {
        if (isVaccineInLineage(lineage, imm)) {
          var field = {
            label: 'contact.profile.imm.' + imm,
            translate: true,
            width: 6,
          };
          if (isSingleDose(imm)) {
            field.value = immunizations[imm] ? 'yes' : 'no';
          } else {
            field.value = 'contact.profile.imm.doses';
            field.context = {
              count: countDosesReceived(immunizations, imm),
              total: countDosesPossible(imm),
            };
          }
          fields.push(field);
        }
      });
      // Show a report count if no specific immunizations are being tracked
      if (!fields.length) {
        fields.push({
          label: 'contact.profile.imm.generic',
          translate: true,
          value: countReportsSubmittedInWindow(immunizationForms, now),
          width: 12,
        });
      }
      return fields;
    },
  },
];

// Added to ensure CHW info is pulled into forms accessed via tasks
if(lineage[0] && lineage[0].contact) {
  context.chw_name = lineage[0].contact.name;
  context.chw_phone = lineage[0].contact.phone;
}
