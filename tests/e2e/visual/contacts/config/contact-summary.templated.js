const moment = require('moment');
const extras = require('./contact-summary-extras');

const {
  today,
  isHighRiskPregnancy,
  getNewestReport,
  getSubsequentPregnancyFollowUps,
  isAlive,
  isReadyForNewPregnancy,
  isReadyForDelivery,
  isActivePregnancy,
  countANCFacilityVisits,
  getAllRiskFactors,
  getLatestDangerSignsForPregnancy,
  getNextANCVisitDate,
  getMostRecentLMPDateForPregnancy,
  getMostRecentEDDForPregnancy,
  getRecentANCVisitWithEvent,
  getAllRiskFactorExtra,
  getField,
  now,
  IMMUNIZATION_LIST,
  addImmunizations,
  getAgeInMonths,
  initImmunizations,
  isSingleDose,
  countDosesReceived,
  countDosesPossible,
  countReportsSubmittedInWindow,
  immunizationForms,
} = extras;

// contact, reports, lineage are globally available for contact-summary
// eslint-disable-next-line no-undef
const thisContact = contact;
// eslint-disable-next-line no-undef
const thisLineage = lineage;
// eslint-disable-next-line no-undef
const allReports = reports;

const context = {
  alive: isAlive(thisContact),
  muted: false,
  showPregnancyForm: isReadyForNewPregnancy(thisContact, allReports),
  showDeliveryForm: isReadyForDelivery(thisContact, allReports),
};

const fields = [
  {
    appliesToType: 'person',
    label: 'patient_id',
    value: thisContact.patient_id,
    width: 4,
  },
  {
    appliesToType: 'person',
    label: 'contact.age',
    value: thisContact.date_of_birth,
    width: 4,
    filter: 'age',
  },
  {
    appliesToType: 'person',
    label: 'contact.sex',
    value: `contact.sex.${thisContact.sex}`,
    translate: true,
    width: 4,
  },
  {
    appliesToType: 'person',
    label: 'person.field.phone',
    value: thisContact.phone,
    width: 4,
  },
  {
    appliesToType: 'person',
    label: 'contact.parent',
    value: thisLineage,
    filter: 'lineage',
  },
  {
    appliesToType: '!person',
    label: 'contact',
    value: thisContact.contact && thisContact.contact.name,
    width: 4,
  },
  {
    appliesToType: '!person',
    label: 'contact.phone',
    value: thisContact.contact && thisContact.contact.phone,
    width: 4,
  },
  {
    appliesToType: 'clinic',
    label: 'Last Visited',
    value: '36 days ago',
    width: 4,
  },
  {
    appliesToType: '!person',
    appliesIf: function () {
      return thisContact.parent && thisLineage[0];
    },
    label: 'contact.parent',
    value: thisLineage,
    filter: 'lineage',
  },
];

if (thisContact.short_name) {
  fields.unshift({
    appliesToType: 'person',
    label: 'contact.short_name',
    value: thisContact.short_name,
    width: 4,
  });
}

const cards = [
  {
    label: 'contact.profile.pregnancy.active',
    appliesToType: 'report',
    appliesIf: function (report) {
      return isActivePregnancy(thisContact, allReports, report);
    },
    fields: function (report) {
      const fields = [];
      const riskFactors = getAllRiskFactors(allReports, report);
      const riskFactorsCustom = getAllRiskFactorExtra(allReports, report);
      const dangerSigns = getLatestDangerSignsForPregnancy(allReports, report);
      const highRisk = isHighRiskPregnancy(allReports, report);
      const mostRecentANC = getNewestReport(allReports, ['pregnancy', 'pregnancy_home_visit']);
      const mostRecentANCDate = moment(mostRecentANC.reported_date);
      const lmp_date = getMostRecentLMPDateForPregnancy(allReports, report);
      const edd_ms = getMostRecentEDDForPregnancy(allReports, report);
      const nextAncVisitDate = getNextANCVisitDate(allReports, report);
      const weeksPregnant = lmp_date ? today.diff(lmp_date, 'weeks') : null;

      let lmp_approx = getField(report, 'lmp_approx');
      let reportDate = report.reported_date;

      getSubsequentPregnancyFollowUps(allReports, report).forEach(function (followUpReport) {
        if (followUpReport.reported_date > reportDate && getField(followUpReport, 'lmp_updated') === 'yes') {
          reportDate = followUpReport.reported_date;
          if (getField(followUpReport, 'lmp_method_approx')) {
            lmp_approx = getField(followUpReport, 'lmp_method_approx');
          }
        }
      });

      const migratedReport = getRecentANCVisitWithEvent(allReports, report, 'migrated');
      const refusedReport = getRecentANCVisitWithEvent(allReports, report, 'refused');
      const stopReport = migratedReport || refusedReport;

      if (stopReport) {
        const clearAll = getField(stopReport, 'pregnancy_ended.clear_option') === 'clear_all';
        fields.push(
          {
            label: 'contact.profile.change_care',
            value: migratedReport ? 'Migrated out of area' : 'Refusing care',
            width: 6
          },
          { label: 'contact.profile.tasks_on_off', value: clearAll ? 'Off' : 'On', width: 6 }
        );
      }

      fields.push(
        {
          label: 'Weeks Pregnant',
          value: weeksPregnant !== null
            ? { number: weeksPregnant, approximate: lmp_approx === 'yes' }
            : 'contact.profile.value.unknown',
          translate: weeksPregnant === null,
          filter: weeksPregnant !== null ? 'weeksPregnant' : '',
          width: 6
        },
        {
          label: 'contact.profile.edd',
          value: edd_ms ? edd_ms.valueOf() : 'contact.profile.value.unknown',
          translate: !edd_ms,
          filter: edd_ms ? 'simpleDate' : '',
          width: 6
        }
      );

      if (highRisk) {
        let riskValue = '';
        if (!riskFactors && riskFactorsCustom) {
          riskValue = riskFactorsCustom.join(', ');
        } else if (riskFactors.length > 1 || (riskFactors && riskFactorsCustom)) {
          riskValue = 'contact.profile.risk.multiple';
        } else {
          riskValue = 'contact.profile.danger_sign.' + riskFactors[0];
        }
        fields.push(
          { label: 'contact.profile.risk.high', value: riskValue, translate: true, icon: 'icon-risk', width: 6 }
        );
      }

      if (dangerSigns.length > 0) {
        fields.push({
          label: 'contact.profile.danger_signs.current',
          value: dangerSigns.length > 1
            ? 'contact.profile.danger_sign.multiple'
            : `contact.profile.danger_sign.${dangerSigns[0]}`,
          translate: true,
          width: 6
        });
      }

      fields.push(
        {
          label: 'contact.profile.visit',
          value: 'contact.profile.visits.of',
          context: { count: countANCFacilityVisits(allReports, report), total: 8 },
          translate: true,
          width: 6
        },
        { label: 'contact.profile.last_visited', value: mostRecentANCDate.valueOf(), filter: 'relativeDay', width: 6 }
      );

      if (nextAncVisitDate && nextAncVisitDate.isSameOrAfter(today)) {
        fields.push(
          { label: 'contact.profile.anc.next', value: nextAncVisitDate.valueOf(), filter: 'simpleDate', width: 6 }
        );
      }

      return fields;
    },
    modifyContext: function (ctx, report) {
      let lmpDate = getField(report, 'lmp_date_8601');
      let lmpMethodApprox = getField(report, 'lmp_method_approx');
      let hivTested = getField(report, 'hiv_status_known');
      let dewormingMedicationReceived = getField(report, 'deworming_med_received');
      let ttReceived = getField(report, 'tt_received');
      const riskFactorCodes = getAllRiskFactors(allReports, report);
      const riskFactorsCustom = getAllRiskFactorExtra(allReports, report);
      let pregnancyFollowupDateRecent = getField(report, 't_pregnancy_follow_up_date');

      getSubsequentPregnancyFollowUps(allReports, report).forEach(function (followUpReport) {
        if (getField(followUpReport, 'lmp_updated') === 'yes') {
          lmpDate = getField(followUpReport, 'lmp_date_8601');
          lmpMethodApprox = getField(followUpReport, 'lmp_method_approx');
        }
        hivTested = getField(followUpReport, 'hiv_status_known');
        dewormingMedicationReceived = getField(followUpReport, 'deworming_med_received');
        ttReceived = getField(followUpReport, 'tt_received');
        if (getField(followUpReport, 't_pregnancy_follow_up') === 'yes') {
          pregnancyFollowupDateRecent = getField(followUpReport, 't_pregnancy_follow_up_date');
        }
      });

      ctx.lmp_date_8601 = lmpDate;
      ctx.lmp_method_approx = lmpMethodApprox;
      ctx.is_active_pregnancy = true;
      ctx.deworming_med_received = dewormingMedicationReceived;
      ctx.hiv_tested_past = hivTested;
      ctx.tt_received_past = ttReceived;
      ctx.risk_factor_codes = riskFactorCodes.join(' ');
      ctx.risk_factor_extra = riskFactorsCustom.join('; ');
      ctx.pregnancy_follow_up_date_recent = pregnancyFollowupDateRecent;
      ctx.pregnancy_uuid = report._id;
    }
  },
  {
    label: 'contact.profile.immunizations',
    appliesToType: 'person',
    appliesIf: function() {
      return getAgeInMonths() < 144;
    },
    fields: function() {
      const immunizations = initImmunizations();
      reports.forEach(function(report) {
        if (report.form === 'immunization_visit') {
          if (report.fields && report.fields.vaccines_received) {
            addImmunizations(immunizations, report.fields.vaccines_received);
          }
        } else if (report.form === 'C_IMM') {
          addImmunizations(immunizations, report.fields);
        } else {
          addImmunizations(immunizations, report.form);
        }
      });

      const fields = IMMUNIZATION_LIST.map(function(imm) {
        const field = {
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
        return field;
      });

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

module.exports = {
  context: context,
  cards: cards,
  fields: fields
};
