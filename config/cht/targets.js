const extras = require('./nools-extras');
const FIVE_YEARS_IN_DAYS = 1826;
const {
  today,
  addDays,
  isAlive,
  getSubsequentPregnancyFollowUps,
  isOnSameMonth,
  getMostRecentLMPDateForPregnancy,
  isActivePregnancy,
  countANCFacilityVisits
} = extras;

module.exports = [

  {
    id: 'newborn-mortality',
    type: 'percent',
    icon: 'icon-death-neonatal',
    goal: 0,
    translation_key: 'targets.anc.newborn_mortality.title',
    subtitle_translation_key: 'targets.all_time.subtitle',
    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: function (c) {
      //console.log('a', c.contact.name, c.contact.date_of_birth, addDays(c.contact.date_of_birth, FIVE_YEARS_IN_DAYS).getTime(), today, addDays(c.contact.date_of_birth, FIVE_YEARS_IN_DAYS) > today);
      return c && c.contact.date_of_birth && addDays(c.contact.date_of_birth, FIVE_YEARS_IN_DAYS) > today;
    },
    passesIf: function (c) {
      //console.log('p', c.contact.name, c.contact.date_of_death, addDays(c.contact.date_of_birth, FIVE_YEARS_IN_DAYS) > new Date(c.contact.date_of_death));
      return c.contact.date_of_death && addDays(c.contact.date_of_birth, FIVE_YEARS_IN_DAYS) > new Date(c.contact.date_of_death);
    },
    date: 'now',
    idType: 'contact'
  },

  {
    id: 'deaths-this-month',
    type: 'count',
    icon: 'icon-death-general',
    goal: 0,
    translation_key: 'targets.death_reporting.deaths.title',
    subtitle_translation_key: 'targets.this_month.subtitle',
    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: function (c) {
      return !isAlive(c) && isOnSameMonth(today, c.contact.date_of_death);
    },
    date: 'now'//'reported' does not work with contact here, because contact.reported_date can be older
  },

  // ANC: New Pregnancies as a count - this month with LMP, with a goal of 20
  {
    id: 'pregnancy-registrations-this-month',
    type: 'count',
    icon: 'icon-pregnancy',
    goal: 20,
    translation_key: 'targets.anc.new_pregnancy_registrations.title',
    subtitle_translation_key: 'targets.this_month.subtitle',
    appliesTo: 'reports',
    appliesToType: ['pregnancy'],
    appliesIf: function (c, r) {
      if (r === null) return false;
      if (getMostRecentLMPDateForPregnancy(c, r) === null) return false;
      return true;
    },
    date: 'reported',
    idType: 'contact'
  },

  {
    id: 'births-this-month',
    type: 'count',
    icon: 'icon-infant',
    goal: -1,
    translation_key: 'targets.births.title',
    subtitle_translation_key: 'targets.this_month.subtitle',
    appliesTo: 'contacts',
    appliesToType: ['person'],
    appliesIf: function (c) {
      if (c === null) return false;
      //console.log('c', c.contact.name, c.contact.date_of_birth, today, isOnSameMonth(c.contact.date_of_birth, today) );
      return isOnSameMonth(c.contact.date_of_birth, today);
    },
    date: 'now'
  },


  // ANC: Number of active pregnancies as a count - all time
  {
    id: 'active-pregnancies',
    type: 'count',
    icon: 'icon-pregnancy',
    goal: -1,
    translation_key: 'targets.anc.active_pregnancies.title',
    subtitle_translation_key: 'targets.all_time.subtitle',
    appliesTo: 'reports',
    appliesToType: ['pregnancy'],
    appliesIf: function (c, r) {
      return isActivePregnancy(c, r);
    },
    date: 'now',
    idType: 'contact'
  },

  // ANC: Number of active pregnancies as a count - all time - with 1+ facility visits
  {
    id: 'active-pregnancies-1+-visits',
    type: 'count',
    icon: 'icon-clinic',
    goal: -1,
    translation_key: 'targets.anc.active_pregnancies_1p_visits.title',
    subtitle_translation_key: 'targets.all_time.subtitle',
    appliesTo: 'reports',
    appliesToType: ['pregnancy'],
    appliesIf: function (c, r) {
      if (!isActivePregnancy(c, r)) return false;
      //count and check visits
      const visitCount = countANCFacilityVisits(c, r);
      return visitCount > 0;
    },
    date: 'now',
    idType: 'contact'
  },

  {
    id: 'facility-deliveries',
    type: 'percent',
    icon: 'icon-mother-child',
    goal: -1,
    translation_key: 'targets.anc.facility_deliveries.title',
    subtitle_translation_key: 'targets.all_time.subtitle',
    appliesTo: 'reports',
    appliesToType: ['delivery'],
    appliesIf: function (c, r) {
      return r.fields && r.fields.delivery_outcome && r.fields.delivery_outcome.delivery_place;
    },
    passesIf: function (c, r) {
      return r.fields && r.fields.delivery_outcome && r.fields.delivery_outcome.delivery_place === "health_facility"
    },
    date: 'now',
    idType: 'contact'
  },

  {
    id: 'active-pregnancies-4+-visits',
    type: 'count',
    icon: 'icon-clinic',
    goal: -1,
    translation_key: 'targets.anc.active_pregnancies_4p_visits.title',
    subtitle_translation_key: 'targets.all_time.subtitle',
    appliesTo: 'reports',
    appliesToType: ['pregnancy'],
    appliesIf: function (c, r) {
      if (!isActivePregnancy(c, r)) return false;
      //count and check visits
      const visitCount = countANCFacilityVisits(c, r);
      return visitCount > 3;
    },
    date: 'now',
    idType: 'contact'
  },
  {
    id: 'active-pregnancies-8+-contacts',
    type: 'count',
    icon: 'icon-follow-up',
    goal: -1,
    translation_key: 'targets.anc.active_pregnancies_8p_contacts.title',
    subtitle_translation_key: 'targets.all_time.subtitle',
    appliesTo: 'reports',
    appliesToType: ['pregnancy'],
    appliesIf: function (c, r) {
      //count and check visits
      if (!isActivePregnancy(c, r)) return false;
      const visitCount = getSubsequentPregnancyFollowUps(c, r).length || 0;
      const facilityVisitCount = countANCFacilityVisits(c, r) || 0;
      //console.log('pregnancy visits', visitCount);
      //console.log('health facility visits', facilityVisitCount);

      //pregnancy registration form + pregnancy home visit forms + number of previous hf anc visits 
      return 1 + visitCount + facilityVisitCount > 7;
    },
    date: 'now',
    idType: 'contact'
  },

];