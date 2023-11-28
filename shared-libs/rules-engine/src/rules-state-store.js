/**
 * @module rules-state-store
 * In-memory datastore containing
 * 1. Details on the state of each contact's rules calculations
 * 2. Target emissions @see target-state
 */
const md5 = require('md5');
const calendarInterval = require('@medic/calendar-interval');
const targetState = require('./target-state');

const EXPIRE_CALCULATION_AFTER_MS = 365 * 24 * 60 * 60 * 1000;
let state;
let currentUserContact;
let currentUserSettings;
let onStateChange;

const self = {
  /**
   * Initializes the rules-state-store from an existing state. If existing state is invalid, builds an empty state.
   *
   * @param {Object} existingState State object previously passed to the stateChangeCallback
   * @param {Object} settings Settings for the behavior of the rules store
   * @param {Object} settings.contact User's hydrated contact document
   * @param {Object} settings.user User's user-settings document
   * @param {Object} stateChangeCallback Callback which is invoked whenever the state changes.
   *    Receives the updated state as the only parameter.
   * @returns {Boolean} that represents whether or not the state needs to be rebuilt
   */
  load: (existingState, settings, stateChangeCallback) => {
    if (state) {
      throw Error('Attempted to initialize the rules-state-store multiple times.');
    }

    state = existingState;
    currentUserContact = settings.contact;
    currentUserSettings = settings.user;
    setOnChangeState(stateChangeCallback);

    const rulesConfigHash = hashRulesConfig(settings);
    if (state && state.rulesConfigHash !== rulesConfigHash) {
      state.stale = true;
    }

    return !state || state.stale;
  },

  /**
   * Initializes an empty rules-state-store.
   *
   * @param {Object} settings Settings for the behavior of the rules store
   * @param {Object} settings.contact User's hydrated contact document
   * @param {Object} settings.user User's user-settings document
   * @param {number} settings.monthStartDate reporting interval start date
   * @param {Object} stateChangeCallback Callback which is invoked whenever the state changes.
   *    Receives the updated state as the only parameter.
   */
  build: (settings, stateChangeCallback) => {
    if (state && !state.stale) {
      throw Error('Attempted to initialize the rules-state-store multiple times.');
    }

    state = {
      rulesConfigHash: hashRulesConfig(settings),
      contactState: {},
      targetState: targetState.createEmptyState(settings.targets),
      monthStartDate: settings.monthStartDate,
    };
    currentUserContact = settings.contact;
    currentUserSettings = settings.user;

    setOnChangeState(stateChangeCallback);
    return onStateChange(state);
  },

  /**
   * "Dirty" indicates that the contact's task documents are not up to date. They should be refreshed before being used.
   *
   * The dirty state can be due to:
   * 1. The time of a contact's most recent task calculation is unknown
   * 2. The contact's most recent task calculation expires
   * 3. The contact is explicitly marked as dirty
   * 4. Configurations impacting rules calculations have changed
   *
   * @param {string} contactId The id of the contact to test for dirtiness
   * @returns {Boolean} True if dirty
   */
  isDirty: contactId => {
    if (!contactId) {
      return false;
    }

    if (!state.contactState[contactId]) {
      return true;
    }

    const now = Date.now();
    const { calculatedAt, expireAt, isDirty } = state.contactState[contactId];
    return !expireAt ||
      isDirty ||
      calculatedAt > now || /* system clock changed */
      expireAt < now; /* isExpired */
  },

  /**
   * Determines if either the settings document or user's hydrated contact document have changed in a way which
   * will impact the result of rules calculations.
   * If they have changed in a meaningful way, the calculation state of all contacts is reset
   *
   * @param {Object} settings Settings for the behavior of the rules store
   * @returns {Boolean} True if the state of all contacts has been reset
   */
  rulesConfigChange: (settings) => {
    const rulesConfigHash = hashRulesConfig(settings);
    if (state.rulesConfigHash !== rulesConfigHash) {
      state = {
        rulesConfigHash,
        contactState: {},
        targetState: targetState.createEmptyState(settings.targets),
        monthStartDate: settings.monthStartDate,
      };
      currentUserContact = settings.contact;
      currentUserSettings = settings.user;

      onStateChange(state);
      return true;
    }

    return false;
  },

  /**
   * @param {int} calculatedAt Timestamp of the calculation
   * @param {string[]} contactIds Array of contact ids to be marked as freshly calculated
   */
  markFresh: (calculatedAt, contactIds) => {
    if (!Array.isArray(contactIds)) {
      contactIds = [contactIds];
    }
    contactIds = contactIds.filter(id => id);

    if (contactIds.length === 0) {
      return;
    }

    const reportingInterval = calendarInterval.getCurrent(state.monthStartDate);
    const defaultExpiry = calculatedAt + EXPIRE_CALCULATION_AFTER_MS;

    for (const contactId of contactIds) {
      state.contactState[contactId] = {
        calculatedAt,
        expireAt: Math.min(reportingInterval.end, defaultExpiry),
      };
    }

    return onStateChange(state);
  },

  /**
   * @param {string[]} contactIds Array of contact ids to be marked as dirty
   */
  markDirty: contactIds => {
    if (!Array.isArray(contactIds)) {
      contactIds = [contactIds];
    }
    contactIds = contactIds.filter(id => id);

    if (contactIds.length === 0) {
      return;
    }

    for (const contactId of contactIds) {
      if (!state.contactState[contactId]) {
        state.contactState[contactId] = {};
      }

      state.contactState[contactId].isDirty = true;
    }

    return onStateChange(state);
  },

  /**
   * @returns {string[]} The id of all contacts tracked by the store
   */
  getContactIds: () => Object.keys(state.contactState),

  /**
   * The rules system supports the concept of "headless" reports and "headless" task documents. In these scenarios,
   * a report exists on a user's device while the associated contact document of that report is not on the device.
   * A common scenario associated with this case is during supervisor workflows where supervisors sync reports with the
   * needs_signoff attribute but not the associated patient.
   *
   * In these cases, getting a list of "all the contacts with rules" requires us to look not just through contact
   * docs, but also through reports. To avoid this costly operation, the rules-state-store maintains a flag which
   * indicates if the contact ids in the store can serve as a trustworthy authority.
   *
   * markAllFresh should be called when the list of contact ids within the store is the complete set of contacts with
   * rules
   */
  markAllFresh: (calculatedAt, contactIds) => {
    state.allContactIds = true;
    return self.markFresh(calculatedAt, contactIds);
  },

  /**
   * @returns True if markAllFresh has been called on the current store state.
   */
  hasAllContacts: () => !!state.allContactIds,

  /**
   * @returns {string} User contact document
   */
  currentUserContact: () => currentUserContact,

  /**
   * @returns {string} User settings document
   */
  currentUserSettings: () => currentUserSettings,

  /**
   * @returns {number} The timestamp when the current loaded state was last updated
   */
  stateLastUpdatedAt: () => state.calculatedAt,

  /**
   * @returns {number} current monthStartDate
   */
  getMonthStartDate: () => state.monthStartDate,

  /**
   * @returns {boolean} whether or not the state is loaded
   */
  isLoaded: () => !!state,

  /**
   * Store a set of target emissions which were emitted by refreshing a set of contacts
   *
   * @param {string[]} contactIds An array of contact ids which produced these targetEmissions by being refreshed.
   *    If undefined, all contacts are updated.
   * @param {Object[]} targetEmissions An array of target emissions (the result of the rules-emitter).
   */
  storeTargetEmissions: (contactIds, targetEmissions) => {
    const isUpdated = targetState.storeTargetEmissions(state.targetState, contactIds, targetEmissions);
    if (isUpdated) {
      return onStateChange(state);
    }
  },

  /**
   * Aggregates the stored target emissions into target models
   *
   * @param {Function(emission)=} targetEmissionFilter Filter function to filter which target emissions should
   *    be aggregated
   * @example aggregateStoredTargetEmissions(emission => emission.date > moment().startOf('month').valueOf())
   *
   * @returns {Object[]} result
   * @returns {string} result[n].* All attributes of the target as defined in the settings doc
   * @returns {Integer} result[n].total The total number of unique target emission ids matching instanceFilter
   * @returns {Integer} result[n].pass The number of unique target emission ids matching instanceFilter with the
   *    latest emission with truthy "pass"
   * @returns {Integer} result[n].percent The percentage of pass/total
   */
  aggregateStoredTargetEmissions: targetEmissionFilter => targetState.aggregateStoredTargetEmissions(
    state.targetState,
    targetEmissionFilter
  ),

  /**
   * Returns a list of UUIDs of tracked contacts that are marked as dirty
   * @returns {Array} list of dirty contacts UUIDs
   */
  getDirtyContacts: () => self.getContactIds().filter(self.isDirty),
};

const hashRulesConfig = (settings) => {
  const asString = JSON.stringify(settings);
  return md5(asString);
};

const setOnChangeState = (stateChangeCallback) => {
  onStateChange = (state) => {
    state.calculatedAt = new Date().getTime();

    if (stateChangeCallback && typeof stateChangeCallback === 'function') {
      return stateChangeCallback(state);
    }
  };
};

// ensure all exported functions are only ever called after initialization
module.exports = Object.keys(self).reduce((agg, key) => {
  agg[key] = (...args) => {
    if (!['build', 'load', 'isLoaded'].includes(key) && (!state || !state.contactState)) {
      throw Error(`Invalid operation: Attempted to invoke rules-state-store.${key} before call to build or load`);
    }

    return self[key](...args);
  };
  return agg;
}, {});
