const moment = require('moment');
const extras = require('./contact-summary-extras');
const { today, MAX_DAYS_IN_PREGNANCY, isHighRiskPregnancy, getNewestReport, getSubsequentPregnancyFollowUps,
  getSubsequentDeliveries, isAlive, isReadyForNewPregnancy, isReadyForDelivery, isActivePregnancy, countANCFacilityVisits,
  getAllRiskFactorCodes, getRiskFactorTextFromCodes, getLatestDangerSignsForPregnancy, getNextANCVisitDate,
  getMostRecentLMPDateForPregnancy, getMostRecentEDDForPregnancy, getDeliveryDate, getFormArraySubmittedInWindow,
  getRecentANCVisitWithEvent, getRiskFactorExtra } = extras;



const context = {
  alive: isAlive(contact),
  muted: false,//TODO: how it is muted?,
  show_pregnancy_form: isReadyForNewPregnancy(),
  show_delivery_form: isReadyForDelivery(),
};

const fields = [
  { appliesToType: 'person', label: 'patient_id', value: contact.patient_id, width: 4 },
  { appliesToType: 'person', label: 'contact.age', value: contact.date_of_birth, width: 4, filter: 'age' },
  { appliesToType: 'person', label: 'contact.sex', value: 'contact.sex.' + contact.sex, translate: true, width: 4 },
  { appliesToType: 'person', label: 'contact.phone', value: contact.phone, width: 4 },
  { appliesToType: 'person', label: 'person.field.alternate_phone', value: contact.phone_alternate, width: 4 },
  { appliesToType: 'person', label: 'External ID', value: contact.external_id, width: 4 },
  { appliesToType: 'person', label: 'contact.parent', value: lineage, filter: 'lineage' },
  { appliesToType: '!person', label: 'Contact', value: contact.contact && contact.contact.name, width: 4 },
  { appliesToType: '!person', label: 'contact.phone', value: contact.contact && contact.contact.phone, width: 4 },
  { appliesToType: '!person', label: 'External ID', value: contact.external_id, width: 4 },
  { appliesToType: '!person', appliesIf: function () { return contact.parent && lineage[0]; }, label: 'contact.parent', value: lineage, filter: 'lineage' },
  { appliesToType: 'person', label: 'contact.notes', value: contact.notes, width: 12 },
  { appliesToType: '!person', label: 'contact.notes', value: contact.notes, width: 12 }
];

if (contact.short_name) {
  fields.unshift({ appliesToType: 'person', label: 'contact.short_name', value: contact.short_name, width: 4 });
}

const cards = [
  {
    label: 'contact.profile.pregnancy.active',
    appliesToType: 'report',
    appliesIf: function (r) { return isActivePregnancy(r) },
    fields: function (r) {
      const fields = [];
      const riskFactors = getRiskFactorTextFromCodes(getAllRiskFactorCodes(r));
      const riskFactorCustom = getRiskFactorExtra(r);
      if (riskFactorCustom) riskFactors.push(riskFactorCustom);
      const dangerSigns = getLatestDangerSignsForPregnancy(r);

      const highRisk = isHighRiskPregnancy(r);

      const mostRecentANC = getNewestReport(reports, ['pregnancy', 'pregnancy_home_visit']);
      const mostRecentANCDate = moment(mostRecentANC.reported_date);
      const weeksSinceLastANC = today.diff(mostRecentANCDate, 'weeks');
      //console.log('wsl', mostRecentANCDate.toDate(), weeksSinceLastANC);
      const lmp_date = getMostRecentLMPDateForPregnancy(r);
      const edd_ms = getMostRecentEDDForPregnancy(r);
      const nextAncVisitDate = getNextANCVisitDate(r);
      //console.log('today', today, 'lmp', lmp_date);
      const weeksPregnant = lmp_date ? today.diff(lmp_date, "weeks") : null;
      //console.log('wp', weeksPregnant);
      let lmp_approx = r.fields && r.fields.lmp_approx;
      let reportDate = r.reported_date;
      getSubsequentPregnancyFollowUps(r).forEach(function (fr) {
        if (fr.reported_date > reportDate && fr.fields && fr.fields.lmp_updated === 'yes') {//check if LMP updated
          reportDate = fr.reported_date;
          if (fr.fields.lmp_method_approx) {
            lmp_approx = r.fields.lmp_method_approx;
          }
        }
        const riskFactorCustomNew = getRiskFactorExtra(fr);
        if (riskFactorCustomNew) riskFactors.push(riskFactorCustomNew);
      });
      //These two would only show up if the CHW answered, "no, refusing care" or "no, migrated out of area" to the question "do you want to start this pregnancy visit?" it would continue to be shown as an active pregnancy until the max EDD.
      //If a woman returns to care and the CHW submits another pregnancy visit form, these fields would go away the pregnancy would revert to normal, active status.
      //Change in care: Migraed out of area / refusing care
      //Tasks: On/Off
      const migratedReport = getRecentANCVisitWithEvent(r, 'migrated');
      const refusedReport = getRecentANCVisitWithEvent(r, 'refused');
      const ccr = migratedReport || refusedReport;
      if (ccr) {
        const clearAll = ccr.fields && ccr.fields.pregnancy_ended && ccr.fields.pregnancy_ended.clear_option === 'clear_all';
        fields.push(
          { label: 'contact.profile.change_care', value: migratedReport ? 'Migrated out of area' : 'Refusing care', width: 6 },
          { label: 'contact.profile.tasks_on_off', value: clearAll ? 'Off' : 'On', width: 6 }
        );
      }
      //console.log('edd', edd_ms);
      fields.push(
        { label: 'Weeks Pregnant', value: weeksPregnant === null ? 'contact.profile.value.unknown' : { number: weeksPregnant, approximate: lmp_approx === 'yes' }, translate: weeksPregnant === null, filter: weeksPregnant === null ? '' : 'weeksPregnant', width: 6 },
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

      //console.log(mostRecentANCDate);
      fields.push(
        { label: 'contact.profile.visit', value: 'contact.profile.visits.of', context: { count: countANCFacilityVisits(r), total: 8 }, translate: true, width: 6 },
        { label: 'contact.profile.last_visited', value: weeksSinceLastANC + (weeksSinceLastANC === 1 ? ' week ago' : ' weeks ago'), width: 6 }
      );

      if (nextAncVisitDate !== null && nextAncVisitDate.isSameOrAfter(today)) {
        //console.log(nextAncVisitDate);
        fields.push(
          { label: 'contact.profile.anc.next', value: nextAncVisitDate.valueOf(), filter: 'simpleDate', width: 6 }
        );
      }

      return fields;
    },
    modifyContext: function (ctx, r) {
      let lmpDate = r.fields.lmp_date_8601;
      let lmpMethodApprox = r.fields.lmp_method_approx;
      let hivTested = r.fields.hiv_status_known;
      let dewormingMedicationReceived = r.fields.deworming_med_received;
      let ttReceived = r.fields.tt_received;
      const riskFactorCodes = getAllRiskFactorCodes(r);
      const riskFactorsCustom = getRiskFactorExtra(r) ? [getRiskFactorExtra(r)] : [];
      let pregnancyFollowupDateRecent = r.fields.t_pregnancy_follow_up_date;

      let reportDate = r.reported_date;
      const followUps = getSubsequentPregnancyFollowUps(r);
      followUps.forEach(function (fr) {
        if (fr.reported_date > reportDate) {
          reportDate = fr.reported_date;
          if (fr.fields && fr.fields.lmp_updated === 'yes') {
            lmpDate = fr.fields.lmp_date_8601;
            lmpMethodApprox = fr.fields.lmp_method_approx;
          }
          hivTested = fr.fields.hiv_status_known;
          dewormingMedicationReceived = fr.fields.deworming_med_received;
          ttReceived = fr.fields.tt_received;
          if (fr.fields.t_pregnancy_follow_up === 'yes')
            pregnancyFollowupDateRecent = fr.fields.t_pregnancy_follow_up_date;
        }
        const riskFactorCustomNew = getRiskFactorExtra(fr);
        if (riskFactorCustomNew) {
          riskFactorsCustom.push(riskFactorCustomNew);
          //console.log(riskFactorsCustom);
        }
      });
      ctx.lmp_date_8601 = lmpDate;
      //console.log('Is Active Pregnancy');
      ctx.is_active_pregnancy = true;
      ctx.deworming_med_received = dewormingMedicationReceived;
      ctx.hiv_tested_past = hivTested;
      ctx.tt_received_past = ttReceived;
      ctx.risk_factor_codes = riskFactorCodes.join(' ');
      ctx.risk_factor_extra = riskFactorsCustom.join('; ');
      ctx.pregnancy_follow_up_date_recent = pregnancyFollowupDateRecent;
    },
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
      return !isAlive(contact);
    },
    fields: function () {
      const fields = [];
      let dateOfDeath = null;
      let placeOfDeath = null;
      const deathReport = getNewestReport(reports, ['death_report']);
      if (deathReport) {
        const deathDetails = deathReport.fields && deathReport.fields.death_details;
        if (deathDetails) {
          dateOfDeath = deathDetails.date_of_death;
          placeOfDeath = deathDetails.place_of_death;
        }
      }
      else if (contact.date_of_death) {
        dateOfDeath = contact.date_of_death;
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
    appliesIf: function (r) {
      if (contact.type !== 'person') return false;
      if (r.form === 'delivery') return true;
      if (r.form === 'pregnancy') {
        //check if early end to pregnancy (miscarriage/abortion)
        if (getRecentANCVisitWithEvent(r, 'abortion') || getRecentANCVisitWithEvent(r, 'miscarriage')) {
          return true;
        }
        //check if 42 weeks past pregnancy and no delivery form submitted
        const lmpDate = getMostRecentLMPDateForPregnancy(r);
        return lmpDate && today.isSameOrAfter(lmpDate.clone().add(42, "weeks")) && getSubsequentDeliveries(r, MAX_DAYS_IN_PREGNANCY).length === 0;

      }
      return false;
    },
    fields: function (r) {
      const fields = [];
      let relevantPregnancy = null;
      let dateOfDelivery = null;
      let placeOfDelivery = '';
      let babiesDelivered = 0;
      let babiesDeceased = 0;
      let ancFacilityVisits = 0;

      //if there was a delivery, early end to pregnancy or 42 weeks have passed
      //Date of delivery (dd-mm-yyyy)
      if (r.form === 'delivery') {
        const deliveryReportDate = moment(r.reported_date);
        relevantPregnancy = getFormArraySubmittedInWindow(reports, ['pregnancy'], deliveryReportDate.clone().subtract(MAX_DAYS_IN_PREGNANCY, 'days').toDate(), deliveryReportDate.toDate())[0];

        if (r.fields && r.fields.delivery_outcome)//If there was a delivery
        {
          dateOfDelivery = getDeliveryDate(r);
          //Place of delivery (home/facility/other)
          placeOfDelivery = r.fields.delivery_outcome.delivery_place;
          //Number of babies delivered
          babiesDelivered = r.fields.delivery_outcome.babies_delivered_num;
          babiesDeceased = r.fields.delivery_outcome.babies_deceased_num;
          //console.log(dateOfDelivery.toDate());
          fields.push(
            { label: 'contact.profile.delivery_date', value: dateOfDelivery ? dateOfDelivery.valueOf() : '', filter: 'simpleDate', width: 6 },
            { label: 'contact.profile.delivery_place', value: placeOfDelivery, translate: true, width: 6 },
            { label: 'contact.profile.delivered_babies', value: babiesDelivered, width: 6 }
          );
        }
      }
      else if (r.form === 'pregnancy') {
        //if early end to pregnancy
        relevantPregnancy = r;
        const lmpDate = getMostRecentLMPDateForPregnancy(relevantPregnancy);
        const abortionReport = getRecentANCVisitWithEvent(relevantPregnancy, 'abortion');
        const miscarriageReport = getRecentANCVisitWithEvent(relevantPregnancy, 'miscarriage');
        const endReport = abortionReport || miscarriageReport;
        if (endReport) {
          let endReason = '';
          let endDate = moment(0);
          let weeksPregnantAtEnd = 0;
          if (abortionReport) {
            endReason = 'abortion';
            endDate = abortionReport.fields && abortionReport.fields.pregnancy_ended && moment(abortionReport.fields.pregnancy_ended.abortion_date);
          }
          else {
            endReason = 'miscarriage';
            endDate = miscarriageReport.fields && miscarriageReport.fields.pregnancy_ended && moment(miscarriageReport.fields.pregnancy_ended.miscarriage_date);
          }

          weeksPregnantAtEnd = endDate.diff(lmpDate, 'weeks');
          //weeksPregnantAtEnd = lmpDate ? Math.floor((getDateMS(endDate) - lmpDate) / (7 * MS_IN_DAY)) : null;
          fields.push(
            { label: 'contact.profile.pregnancy.end_early', value: endReason, translate: true, width: 6 },
            { label: 'contact.profile.pregnancy.end_date', value: endDate.valueOf(), filter: 'simpleDate', width: 6 },
            { label: 'contact.profile.pregnancy.end_weeks', value: weeksPregnantAtEnd > 0 ? weeksPregnantAtEnd : 'contact.profile.value.unknown', translate: weeksPregnantAtEnd <= 0, width: 6 }
          );
        }
        //if no delivery form and past 42 weeks, display EDD as delivery date
        else if (lmpDate && today.isSameOrAfter(lmpDate.clone().add(42, "weeks")) && getSubsequentDeliveries(r, MAX_DAYS_IN_PREGNANCY).length === 0) {
          dateOfDelivery = getMostRecentEDDForPregnancy(r);
          fields.push({ label: 'contact.profile.delivery_date', value: dateOfDelivery ? dateOfDelivery.valueOf() : 'contact.profile.value.unknown', filter: 'simpleDate', translate: dateOfDelivery ? false : true, width: 6 });
        }

      }

      if (babiesDeceased > 0) {
        //only show if babies deceased > 0
        //Number of babies deceased
        if (r.fields && r.fields.baby_death) {
          //console.log(r.fields.baby_death);
          fields.push({ label: 'contact.profile.deceased_babies', value: babiesDeceased, width: 6 });
          let babyDeaths = r.fields && r.fields.baby_death && r.fields.baby_death.baby_death_repeat;
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

        ancFacilityVisits = countANCFacilityVisits(relevantPregnancy);
        fields.push(
          { label: 'contact.profile.anc_visit', value: ancFacilityVisits, width: 3 }
        );
        riskFactors = getRiskFactorTextFromCodes(getAllRiskFactorCodes(relevantPregnancy));
        const riskFactorCustom = getRiskFactorExtra(relevantPregnancy);
        if (riskFactorCustom) riskFactors.push(riskFactorCustom);
        const highRisk = isHighRiskPregnancy(relevantPregnancy)
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