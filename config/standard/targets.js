var targets = [
  // Pregnancy related widgets
  // TODO could this target be person-based instead of report based?
  {
    id: 'active-pregnancies',
    type: 'count',
    icon: 'pregnancy-1',
    goal: -1,
    translation_key: 'targets.active_pregnancies.title',
    subtitle_translation_key: 'targets.all_time.subtitle',

    appliesTo: 'reports',
    appliesIf: function(c, r) {
      if (!isNewestPregnancy(c, r)) return false;

      if (getNewestDeliveryTimestamp(c) < getNewestPregnancyTimestamp(c))
        return true;

      var lmp = new Date(r.lmp_date);
      var maxEDD = new Date(now);
      maxEDD.setDate(lmp.getDate() + 294);
      return maxEDD < now;
    },
    date: 'now',
  },

  // PREGNANCIES REGISTERED THIS MONTH
  {
    // FIXME this seems to count _all_ pregnancy registrations - not just ones made this month
    id: 'pregnancy-registrations-this-month',
    type: 'count',
    icon: 'pregnancy-1',
    goal: -1,
    translation_key: 'targets.pregnancy_registrations.title',
    subtitle_translation_key: 'targets.this_month.subtitle',

    appliesTo: 'reports',
    appliesIf: isNewestPregnancy,
    emitCustom: function(c, r) {
      var instance = createTargetInstance(
        'pregnancy-registrations-this-month',
        r,
        true
      );
      // use contact id to avoid counting multiple pregnancies for same person
      instance._id = c.contact._id + '-' + 'pregnancy-registrations-this-month';
      emitTargetInstance(instance);
    },
    date: 'reported',
  },

  // Birth related widgets
  // BIRTHS THIS MONTH
  {
    // FIXME this appears to count all births ever (there's no date check!');
    id: 'births-this-month',
    type: 'count',
    icon: 'infant',
    goal: -1,
    translation_key: 'targets.births.title',
    subtitle_translation_key: 'targets.this_month.subtitle',

    appliesTo: 'reports',
    appliesIf: isHealthyDelivery,
    date: 'reported',
  },

  // % DELIVERIES ALL TIME WITH 1+ VISITS
  {
    id: 'delivery-with-min-1-visit',
    type: 'percent',
    icon: 'nurse',
    goal: 100,
    translation_key: 'targets.delivery_1_visit.title',
    subtitle_translation_key: 'targets.all_time.subtitle',

    appliesTo: 'reports',
    idType: 'report',
    appliesIf: isHealthyDelivery,
    passesIf: function(c, r) {
      var visits = countReportsSubmittedInWindow(
        c.reports,
        antenatalForms,
        r.reported_date - MAX_DAYS_IN_PREGNANCY * MS_IN_DAY,
        r.reported_date
      );
      return visits > 0;
    },
    date: 'now',
  },

  // % DELIVERIES ALL TIME WITH 4+ VISITS
  {
    id: 'delivery-with-min-4-visits',
    type: 'percent',
    icon: 'nurse',
    goal: 100,
    translation_key: 'targets.delivery_4_visits.title',
    subtitle_translation_key: 'targets.all_time.subtitle',

    appliesTo: 'reports',
    idType: 'report',
    appliesIf: isHealthyDelivery,
    passesIf: function(c, r) {
      var visits = countReportsSubmittedInWindow(
        c.reports,
        antenatalForms,
        r.reported_date - MAX_DAYS_IN_PREGNANCY * MS_IN_DAY,
        r.reported_date
      );
      return visits > 3;
    },
    date: 'now',
  },

  // % DELIVERIES AT HEALTH FACILITY TOTAL
  {
    id: 'delivery-at-facility-total',
    type: 'percent',
    icon: 'clinic',
    goal: 100,
    translation_key: 'targets.facility_deliveries.title',
    subtitle_translation_key: 'targets.all_time.subtitle',

    appliesTo: 'reports',
    idType: 'report',
    appliesIf: isHealthyDelivery,
    passesIf: isFacilityDelivery,
    date: 'now',
  },

  // TARGETS FOR 6-WEEK PNC PERIOD

  // PNC: WOMEN IN ACTIVE PNC PERIOD
  {
    id: 'pnc-active',
    type: 'count',
    icon: 'mother-child',
    goal: -1,
    translation_key: 'targets.active_pnc.title',
    subtitle_translation_key: 'targets.all_time.subtitle',
    context:
      "(user.parent.use_cases && user.parent.use_cases.split(' ').indexOf('pnc') !== -1) || (user.parent.parent.use_cases && user.parent.parent.use_cases.split(' ').indexOf('pnc') !== -1)",

    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: isWomanInActivePncPeriod,
  },

  // PNC: PNC registrations this month
  // Total number of delivery reports received this month (includes D forms and delivery reports)
  {
    id: 'pnc-registered-this-month',
    type: 'count',
    icon: 'infant',
    goal: -1,
    translation_key: 'targets.pnc_registrations.title',
    subtitle_translation_key: 'targets.all_time.subtitle',
    context:
      "(user.parent.use_cases && user.parent.use_cases.split(' ').indexOf('pnc') !== -1) || (user.parent.parent.use_cases && user.parent.parent.use_cases.split(' ').indexOf('pnc') !== -1)",

    appliesTo: 'reports',
    idType: 'report',
    appliesIf: isHealthyDelivery,
    date: 'reported',
  },

  // PNC: PNC visits this month
  {
    id: 'pnc-visits-this-month',
    type: 'count',
    icon: 'infant',
    goal: -1,
    translation_key: 'targets.pnc_visits.title',
    subtitle_translation_key: 'targets.this_month.subtitle',
    context:
      "(user.parent.use_cases && user.parent.use_cases.split(' ').indexOf('pnc') !== -1) || (user.parent.parent.use_cases && user.parent.parent.use_cases.split(' ').indexOf('pnc') !== -1)",
    appliesTo: 'reports',
    idType: 'report',
    appliesIf: function(c, r) {
      return (
        postnatalForms.indexOf(r.form) !== -1 ||
        (deliveryForms.indexOf(r.form) !== -1 &&
          r.fields.delivery_code &&
          r.fields.delivery_code.toUpperCase() === 'F')
      );
    },
    date: 'reported',
  },

  // PNC: Homebirths with 0 visits currently in PNC period
  {
    id: 'pnc-homebirth-0-visits',
    type: 'count',
    icon: 'household',
    goal: -1,
    translation_key: 'targets.homebirth_no_visits.title',
    subtitle_translation_key: 'targets.all_time.subtitle',
    context:
      "(user.parent.use_cases && user.parent.use_cases.split(' ').indexOf('pnc') !== -1) || (user.parent.parent.use_cases && user.parent.parent.use_cases.split(' ').indexOf('pnc') !== -1)",
    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: isWomanInActivePncPeriod,
    passesIf: function(c) {
      return !isFormSubmittedInWindow(
        c.reports,
        postnatalForms,
        getNewestDeliveryTimestamp(c),
        now.getTime()
      );
    },
  },

  // PNC: HOMEBIRTHS WITH 1+ PNC VISITS, ALL TIME
  // Women who gave birth at home and had at least 1 PNC visit during 6-week PNC Period (includes V forms and postnatal visit forms) - all-time.
  {
    id: 'pnc-homebirth-min-1-visit',
    type: 'percent',
    icon: 'nurse',
    goal: 100,
    translation_key: 'targets.homebirth_1_visit.title',
    subtitle_translation_key: 'targets.all_time.subtitle',
    context:
      "(user.parent.use_cases && user.parent.use_cases.split(' ').indexOf('pnc') !== -1) || (user.parent.parent.use_cases && user.parent.parent.use_cases.split(' ').indexOf('pnc') !== -1)",

    appliesTo: 'reports',
    appliesIf: function(c, r) {
      return (
        isHealthyDelivery(c, r) &&
        r.fields.delivery_code &&
        r.fields.delivery_code.toUpperCase() !== 'F'
      );
    },
    passesIf: function(c, r) {
      // Find PNC period based on delivery date, not reported date
      // FIXME r.reported_date changed from r.report_date, as that _appeared_ incorrect
      var startPNCperiod = new Date(
        r && (r.birth_date || r.fields.birth_date || r.reported_date)
      );
      var endPNCperiod = new Date(
        startPNCperiod.getFullYear(),
        startPNCperiod.getMonth(),
        startPNCperiod.getDate() + DAYS_IN_PNC
      );

      return isFormSubmittedInWindow(
        c.reports,
        postnatalForms,
        startPNCperiod.getTime(),
        endPNCperiod.getTime()
      );
    },
    date: 'now',
  },

  // TODO maybe this target should be person-based?
  {
    id: 'pnc-3-visits',
    type: 'percent',
    icon: 'nurse',
    goal: 50,
    translation_key: 'targets.birth_3_visits.title',
    subtitle_translation_key: 'targets.all_time.subtitle',
    context:
      "(user.parent.use_cases && user.parent.use_cases.split(' ').indexOf('pnc') !== -1) || (user.parent.parent.use_cases && user.parent.parent.use_cases.split(' ').indexOf('pnc') !== -1)",

    appliesTo: 'reports',
    appliesIf: isHealthyDelivery,
    passesIf: function(c, r) {
      // Find PNC period based on delivery date, not reported date
      // FIXME r.reported_date changed from r.report_date, as that _appeared_ incorrect
      var startPNCperiod = new Date(
        r && (r.birth_date || r.fields.birth_date || r.reported_date)
      );
      var endPNCperiod = new Date(
        startPNCperiod.getFullYear(),
        startPNCperiod.getMonth(),
        startPNCperiod.getDate() + DAYS_IN_PNC
      );

      // PNC: WOMEN WITH 3 PNC VISITS, ALL TIME
      // Women who had 3 PNC visits confirmed during their 6-week PNC period (includes V forms and postnatal visit forms) - all-time
      var postnatalVisits = countReportsSubmittedInWindow(
        c.reports,
        postnatalForms,
        startPNCperiod.getTime(),
        endPNCperiod.getTime()
      );
      if (isFacilityDelivery(r)) {
        postnatalVisits++;
      }

      return postnatalVisits > 2;
    },
    date: 'now',
  },

  // IMM: NUMBER OF CHILDREN
  {
    id: 'imm-children-under-5-years',
    type: 'count',
    icon: 'children',
    goal: -1,
    translation_key: 'targets.children_u5.title',
    subtitle_translation_key: 'targets.all_time.subtitle',
    context:
      "(user.parent.use_cases && user.parent.use_cases.split(' ').indexOf('imm') !== -1) || (user.parent.parent.use_cases && user.parent.parent.use_cases.split(' ').indexOf('imm') !== -1)",
    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: isChildUnder5,
  },

  // TARGETS FOR CHILDREN UNDER 5 YEARS

  // IMM: CHILDREN REGISTERED THIS MONTH
  {
    id: 'imm-children-registered-this-month',
    type: 'count',
    icon: 'child',
    goal: -1,
    translation_key: 'targets.children_registered.title',
    subtitle_translation_key: 'targets.this_month.subtitle',
    context:
      "(user.parent.use_cases && user.parent.use_cases.split(' ').indexOf('imm') !== -1) || (user.parent.parent.use_cases && user.parent.parent.use_cases.split(' ').indexOf('imm') !== -1)",

    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: isChildUnder5,
    date: function(c) {
      return c.contact.reported_date;
    },
  },

  // IMM: VACCINES DISTRIBUTED THIS MONTH
  {
    id: 'imm-vaccines-given-this-month',
    type: 'count',
    icon: 'immunization',
    goal: -1,
    translation_key: 'targets.vaccines_given.title',
    subtitle_translation_key: 'targets.this_month.subtitle',
    context:
      "(user.parent.use_cases && user.parent.use_cases.split(' ').indexOf('imm') !== -1) || (user.parent.parent.use_cases && user.parent.parent.use_cases.split(' ').indexOf('imm') !== -1)",

    appliesTo: 'reports',
    appliesIf: function(c, r) {
      return immunizationForms.indexOf(r.form) !== -1;
    },
    date: 'reported',
    emitCustom: function(c, r) {
      var i, instance;
      if (r.form === 'immunization_visit' || r.form === 'imm') {
        // Multiple vaccine doses can be reported in a single XForm (app or collect)
        var totalDoses = countDoses(r);
        for (i = 0; i < totalDoses; i++) {
          instance = createTargetInstance(
            'imm-vaccines-given-this-month',
            r,
            true
          );
          instance._id += i;
          emitTargetInstance(instance);
        }
      } else {
        // For TextForms each vaccine is separate report
        instance = createTargetInstance(
          'imm-vaccines-given-this-month',
          r,
          true
        );
        emitTargetInstance(instance);
      }
    },
  },

  // IMM: CHILDREN WITH 1+ VISIT IN PAST 3 MONTHS
  {
    id: 'imm-children-vaccinated-prev-3-months',
    type: 'count',
    icon: 'chw',
    goal: -1,
    translation_key: 'targets.children_vaccinated.title',
    subtitle_translation_key: 'targets.past_3mos.subtitle',
    context:
      "(user.parent.use_cases && user.parent.use_cases.split(' ').indexOf('imm') !== -1) || (user.parent.parent.use_cases && user.parent.parent.use_cases.split(' ').indexOf('imm') !== -1)",

    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: isChildUnder5,
    passesIf: function(c) {
      var visits = countReportsSubmittedInWindow(
        c.reports,
        immunizationForms,
        now.getTime() - 92 * MS_IN_DAY,
        now.getTime()
      );
      return visits >= 1;
    },
  },

  // IMM: CHILDREN WITH NO VISITS
  {
    id: 'imm-no-vaccine-reported',
    type: 'count',
    icon: 'risk',
    goal: -1,
    translation_key: 'targets.children_not_vaccinated.title',
    subtitle_translation_key: 'targets.all_time.subtitle',
    context:
      "(user.parent.use_cases && user.parent.use_cases.split(' ').indexOf('imm') !== -1) || (user.parent.parent.use_cases && user.parent.parent.use_cases.split(' ').indexOf('imm') !== -1)",

    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: isChildUnder5,
    passesIf: function(c) {
      var i;
      for (i = 0; i < c.reports.length; ++i) {
        if (immunizationForms.indexOf(c.reports[i].form !== -1)) {
          return false;
        }
      }
      return true;
    },
  },

  // IMM: CHILDREN WITH BCG REPORTED
  {
    id: 'imm-children-with-bcg-reported',
    type: 'percent',
    icon: 'child',
    goal: 100,
    translation_key: 'targets.bcg_reported.title',
    subtitle_translation_key: 'targets.all_time.subtitle',
    context:
      "(user.parent.use_cases && user.parent.use_cases.split(' ').indexOf('imm') !== -1) || (user.parent.parent.use_cases && user.parent.parent.use_cases.split(' ').indexOf('imm') !== -1)",

    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: isChildUnder5,
    passesIf: isBcgReported,
  },
];
