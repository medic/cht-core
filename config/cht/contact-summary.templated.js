const moment = require('moment');
const extras = require('./contact-summary-extras');
const { today, MAX_DAYS_IN_PREGNANCY, isHighRiskPregnancy, getNewestReport, getSubsequentPregnancyFollowUps,
  getSubsequentDeliveries, isAlive, isReadyForNewPregnancy, isReadyForDelivery, isActivePregnancy, countANCFacilityVisits,
  getAllRiskFactorCodes, getRiskFactorTextFromCodes, getLatestDangerSignsForPregnancy, getNextANCVisitDate,
  getMostRecentLMPDateForPregnancy, getMostRecentEDDForPregnancy, getDeliveryDate, getFormArraySubmittedInWindow,
  getRecentANCVisitWithEvent, getRiskFactorExtra, getField } = extras;


const thisContact = contact;
const allReports = reports;
const context = {
  alive: isAlive(thisContact),
  muted: false,//TODO: how it is muted?,
  show_pregnancy_form: isReadyForNewPregnancy(thisContact, allReports),
  show_delivery_form: isReadyForDelivery(thisContact, allReports),
};

const fields = [
  { appliesToType: 'person', label: 'patient_id', value: thisContact.patient_id, width: 4 },
  { appliesToType: 'person', label: 'contact.age', value: thisContact.date_of_birth, width: 4, filter: 'age' },
  { appliesToType: 'person', label: 'contact.sex', value: 'contact.sex.' + thisContact.sex, translate: true, width: 4 },
  { appliesToType: 'person', label: 'contact.phone', value: thisContact.phone, width: 4 },
  { appliesToType: 'person', label: 'person.field.alternate_phone', value: thisContact.phone_alternate, width: 4 },
  { appliesToType: 'person', label: 'External ID', value: thisContact.external_id, width: 4 },
  { appliesToType: 'person', label: 'contact.parent', value: lineage, filter: 'lineage' },
  { appliesToType: '!person', label: 'contact', value: thisContact.contact && thisContact.contact.name, width: 4 },
  { appliesToType: '!person', label: 'contact.phone', value: thisContact.contact && thisContact.contact.phone, width: 4 },
  { appliesToType: '!person', label: 'External ID', value: thisContact.external_id, width: 4 },
  { appliesToType: '!person', appliesIf: function () { return thisContact.parent && lineage[0]; }, label: 'contact.parent', value: lineage, filter: 'lineage' },
  { appliesToType: 'person', label: 'contact.notes', value: thisContact.notes, width: 12 },
  { appliesToType: '!person', label: 'contact.notes', value: thisContact.notes, width: 12 }
];

if (thisContact.short_name) {
  fields.unshift({ appliesToType: 'person', label: 'contact.short_name', value: thisContact.short_name, width: 4 });
}

const cards = [
  {
    label: 'contact.profile.pregnancy.active',
    appliesToType: 'report',
    appliesIf: function (report) { return isActivePregnancy(thisContact, allReports, report) },
    fields: function (report) {
      const fields = [];
      const riskFactors = getRiskFactorTextFromCodes(getAllRiskFactorCodes(allReports, report));
      const riskFactorCustom = getRiskFactorExtra(report);
      if (riskFactorCustom) riskFactors.push(riskFactorCustom);
      const dangerSigns = getLatestDangerSignsForPregnancy(allReports, report);

      const highRisk = isHighRiskPregnancy(allReports, report);

      const mostRecentANC = getNewestReport(allReports, ['pregnancy', 'pregnancy_home_visit']);
      const mostRecentANCDate = moment(mostRecentANC.reported_date);
      const weeksSinceLastANC = today.diff(mostRecentANCDate, 'weeks');
      const lmp_date = getMostRecentLMPDateForPregnancy(allReports, report);
      const edd_ms = getMostRecentEDDForPregnancy(allReports, report);
      const nextAncVisitDate = getNextANCVisitDate(allReports, report);
      const weeksPregnant = lmp_date ? today.diff(lmp_date, "weeks") : null;
      let lmp_approx = getField(report, 'lmp_approx');
      let reportDate = report.reported_date;
      getSubsequentPregnancyFollowUps(allReports, report).forEach(function (followUpReport) {
        //check if LMP updated
        if (followUpReport.reported_date > reportDate && getField(followUpReport, 'lmp_updated') === 'yes') {
          reportDate = followUpReport.reported_date;
          if (getField(followUpReport, 'lmp_method_approx')) {
            lmp_approx = getField(followUpReport, 'lmp_method_approx');
          }
        }
        const riskFactorCustomNew = getRiskFactorExtra(followUpReport);
        if (riskFactorCustomNew) riskFactors.push(riskFactorCustomNew);
      });
      //These two would only show up if the CHW answered, "no, refusing care" or "no, migrated out of area" to the question "do you want to start this pregnancy visit?" it would continue to be shown as an active pregnancy until the max EDD.
      //If a woman returns to care and the CHW submits another pregnancy visit form, these fields would go away the pregnancy would revert to normal, active status.
      //Change in care: Migraed out of area / refusing care
      //Tasks: On/Off
      const migratedReport = getRecentANCVisitWithEvent(allReports, report, 'migrated');
      const refusedReport = getRecentANCVisitWithEvent(allReports, report, 'refused');
      const stopReport = migratedReport || refusedReport;
      if (stopReport) {
        const clearAll = getField(stopReport, 'pregnancy_ended.clear_option') === 'clear_all';
        fields.push(
          { label: 'contact.profile.change_care', value: migratedReport ? 'Migrated out of area' : 'Refusing care', width: 6 },
          { label: 'contact.profile.tasks_on_off', value: clearAll ? 'Off' : 'On', width: 6 }
        );
      }
      fields.push(
        { label: 'Weeks Pregnant', value: weeksPregnant || weeksPregnant === 0 ? { number: weeksPregnant, approximate: lmp_approx === 'yes' } : 'contact.profile.value.unknown', translate: !weeksPregnant && weeksPregnant !== 0, filter: weeksPregnant || weeksPregnant === 0 ? 'weeksPregnant' : '', width: 6 },
        { label: 'contact.profile.edd', value: edd_ms ? edd_ms.valueOf() : 'contact.profile.value.unknown', translate: !edd_ms, filter: edd_ms ? 'simpleDate' : '', width: 6 }
        //Next ANC clinic visit (Date)
      );

      if (highRisk)
        fields.push(
          { label: 'contact.profile.risk.high', value: riskFactors.join('; '), icon: 'icon-risk', width: 6 }
        );

      if (dangerSigns.length > 0) {
        fields.push({ label: 'contact.profile.danger_signs.current', value: dangerSigns.join(', '), width: 6 });
      }

      fields.push(
        { label: 'contact.profile.visit', value: 'contact.profile.visits.of', context: { count: countANCFacilityVisits(allReports, report), total: 8 }, translate: true, width: 6 },
        { label: 'contact.profile.last_visited', value: weeksSinceLastANC + (weeksSinceLastANC === 1 ? ' week ago' : ' weeks ago'), width: 6 }
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
      const riskFactorCodes = getAllRiskFactorCodes(allReports, report);
      const riskFactorsCustom = getRiskFactorExtra(report) ? [getRiskFactorExtra(report)] : [];
      let pregnancyFollowupDateRecent = getField(report, 't_pregnancy_follow_up_date');

      let reportDate = report.reported_date;
      const followUps = getSubsequentPregnancyFollowUps(allReports, report);
      followUps.forEach(function (followUpReport) {
        if (followUpReport.reported_date > reportDate) {
          reportDate = followUpReport.reported_date;
          if (getField(followUpReport, 'lmp_updated') === 'yes') {
            lmpDate = getField(followUpReport, 'lmp_date_8601');
            lmpMethodApprox = getField(followUpReport, 'lmp_method_approx');
          }
          hivTested = getField(followUpReport, 'hiv_status_known');
          dewormingMedicationReceived = getField(followUpReport, 'deworming_med_received');
          ttReceived = getField(followUpReport, 'tt_received');
          if (getField(followUpReport, 't_pregnancy_follow_up') === 'yes')
            pregnancyFollowupDateRecent = getField(followUpReport, 't_pregnancy_follow_up_date');
        }
        const riskFactorCustomNew = getRiskFactorExtra(followUpReport);
        if (riskFactorCustomNew) {
          riskFactorsCustom.push(riskFactorCustomNew);
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
    //death: Always show as first condition card
    //Date of death:
    //< date reported on delivery form > (may be different than delivery date, if deceased after delivery)

    //Place of death:
    //< home/facility/other> (may be different than delivery place, if deceased after delivery)
    label: 'contact.profile.death.title',
    appliesToType: 'person',
    appliesIf: function () {
      return !isAlive(thisContact);
    },
    fields: function () {
      const fields = [];
      let dateOfDeath;
      let placeOfDeath;
      const deathReport = getNewestReport(allReports, ['death_report']);
      if (deathReport) {
        const deathDetails = getField(deathReport, 'death_details');
        if (deathDetails) {
          dateOfDeath = deathDetails.date_of_death;
          placeOfDeath = deathDetails.place_of_death;
        }
      }
      else if (thisContact.date_of_death) {
        dateOfDeath = thisContact.date_of_death;
      }
      fields.push(
        { label: 'contact.profile.death.date', value: dateOfDeath ? dateOfDeath : 'contact.profile.value.unknown', filter: dateOfDeath ? 'simpleDate' : '', translate: dateOfDeath ? false : true, width: 6 },
        { label: 'contact.profile.death.place', value: placeOfDeath ? placeOfDeath : 'contact.profile.value.unknown', translate: true, width: 6 }
      );
      return fields;
    }
  },
  {
    label: 'contact.profile.pregnancy.past',
    appliesToType: 'report',
    appliesIf: function (report) {
      if (thisContact.type !== 'person') return false;
      if (report.form === 'delivery') return true;
      if (report.form === 'pregnancy') {
        //check if early end to pregnancy (miscarriage/abortion)
        if (getRecentANCVisitWithEvent(allReports, report, 'abortion') || getRecentANCVisitWithEvent(allReports, report, 'miscarriage')) {
          return true;
        }
        //check if 42 weeks past pregnancy and no delivery form submitted
        const lmpDate = getMostRecentLMPDateForPregnancy(allReports, report);
        return lmpDate && today.isSameOrAfter(lmpDate.clone().add(42, "weeks")) && getSubsequentDeliveries(allReports, report, MAX_DAYS_IN_PREGNANCY).length === 0;

      }
      return false;
    },
    fields: function (report) {
      const fields = [];
      let relevantPregnancy;
      let dateOfDelivery;
      let placeOfDelivery = '';
      let babiesDelivered = 0;
      let babiesDeceased = 0;
      let ancFacilityVisits = 0;

      //if there was a delivery, early end to pregnancy or 42 weeks have passed
      //Date of delivery (dd-mm-yyyy)
      if (report.form === 'delivery') {
        const deliveryReportDate = moment(report.reported_date);
        relevantPregnancy = getFormArraySubmittedInWindow(allReports, ['pregnancy'], deliveryReportDate.clone().subtract(MAX_DAYS_IN_PREGNANCY, 'days').toDate(), deliveryReportDate.toDate())[0];

        if (getField(report, 'delivery_outcome'))//If there was a delivery
        {
          dateOfDelivery = getDeliveryDate(report);
          //Place of delivery (home/facility/other)
          placeOfDelivery = getField(report, 'delivery_outcome.delivery_place');
          //Number of babies delivered
          babiesDelivered = getField(report, 'delivery_outcome.babies_delivered_num');
          babiesDeceased = getField(report, 'delivery_outcome.babies_deceased_num');
          fields.push(
            { label: 'contact.profile.delivery_date', value: dateOfDelivery ? dateOfDelivery.valueOf() : '', filter: 'simpleDate', width: 6 },
            { label: 'contact.profile.delivery_place', value: placeOfDelivery, translate: true, width: 6 },
            { label: 'contact.profile.delivered_babies', value: babiesDelivered, width: 6 }
          );
        }
      }
      else if (report.form === 'pregnancy') {
        //if early end to pregnancy
        relevantPregnancy = report;
        const lmpDate = getMostRecentLMPDateForPregnancy(allReports, relevantPregnancy);
        const abortionReport = getRecentANCVisitWithEvent(allReports, relevantPregnancy, 'abortion');
        const miscarriageReport = getRecentANCVisitWithEvent(allReports, relevantPregnancy, 'miscarriage');
        const endReport = abortionReport || miscarriageReport;
        if (endReport) {
          let endReason = '';
          let endDate = moment(0);
          let weeksPregnantAtEnd = 0;
          if (abortionReport) {
            endReason = 'abortion';
            endDate = moment(getField(abortionReport, 'pregnancy_ended.abortion_date'));
          }
          else {
            endReason = 'miscarriage';
            endDate = moment(getField(miscarriageReport, 'pregnancy_ended.miscarriage_date'));
          }

          weeksPregnantAtEnd = endDate.diff(lmpDate, 'weeks');
          fields.push(
            { label: 'contact.profile.pregnancy.end_early', value: endReason, translate: true, width: 6 },
            { label: 'contact.profile.pregnancy.end_date', value: endDate.valueOf(), filter: 'simpleDate', width: 6 },
            { label: 'contact.profile.pregnancy.end_weeks', value: weeksPregnantAtEnd > 0 ? weeksPregnantAtEnd : 'contact.profile.value.unknown', translate: weeksPregnantAtEnd <= 0, width: 6 }
          );
        }
        //if no delivery form and past 42 weeks, display EDD as delivery date
        else if (lmpDate && today.isSameOrAfter(lmpDate.clone().add(42, "weeks")) && getSubsequentDeliveries(allReports, report, MAX_DAYS_IN_PREGNANCY).length === 0) {
          dateOfDelivery = getMostRecentEDDForPregnancy(allReports, report);
          fields.push({ label: 'contact.profile.delivery_date', value: dateOfDelivery ? dateOfDelivery.valueOf() : 'contact.profile.value.unknown', filter: 'simpleDate', translate: dateOfDelivery ? false : true, width: 6 });
        }

      }

      if (babiesDeceased > 0) {
        //only show if babies deceased > 0
        //Number of babies deceased
        if (getField(report, 'baby_death')) {
          fields.push({ label: 'contact.profile.deceased_babies', value: babiesDeceased, width: 6 });
          let babyDeaths = getField(report, 'baby_death.baby_death_repeat');
          if (!babyDeaths) { babyDeaths = []; }
          let count = 0;
          babyDeaths.forEach(function (babyDeath) {
            //repeat:
            //Date of newborn death (dd-mm-yyyy)
            //Place of newborn death (Home/Health facility/Other)
            //Stillbirth? (Yes/No)
            if (count > 0) {
              fields.push({ label: '', value: '', width: 6 });
            }
            fields.push(
              { label: 'contact.profile.newborn.death_date', value: babyDeath.baby_death_date, filter: 'simpleDate', width: 6 },
              { label: 'contact.profile.newborn.death_place', value: babyDeath.baby_death_place, translate: true, width: 6 },
              { label: 'contact.profile.delivery.stillbirthQ', value: babyDeath.stillbirth, translate: true, width: 6 }
            );
            count++;
            //Add a space at the end
            if (count === babyDeaths.length) {
              fields.push({ label: '', value: '', width: 6 });
            }
          }
          );

        }
      }

      if (relevantPregnancy) { //sometimes, there is no pregnancy report

        //always show:
        //ANC facility visits: number of clinic visits reported in pregnancy visit forms (do not include danger sign visits)
        //High Risk (list conditions separated by ;, alert)

        ancFacilityVisits = countANCFacilityVisits(allReports, relevantPregnancy);
        fields.push(
          { label: 'contact.profile.anc_visit', value: ancFacilityVisits, width: 3 }
        );
        const riskFactors = getRiskFactorTextFromCodes(getAllRiskFactorCodes(allReports, relevantPregnancy));
        const riskFactorCustom = getRiskFactorExtra(relevantPregnancy);
        if (riskFactorCustom) riskFactors.push(riskFactorCustom);
        const highRisk = isHighRiskPregnancy(allReports, relevantPregnancy)
        if (highRisk)
          fields.push(
            { label: 'contact.profile.risk.high', value: riskFactors.join('; '), icon: 'icon-risk', width: 6 }
          );
      }

      return fields;
    }
  }
];

// Added to ensure CHW info is pulled into forms accessed via tasks
if (lineage[0] && lineage[0].contact) {
  context.chw_name = lineage[0].contact.name;
  context.chw_phone = lineage[0].contact.phone;
}

module.exports = {
  context: context,
  cards: cards,
  fields: fields
};