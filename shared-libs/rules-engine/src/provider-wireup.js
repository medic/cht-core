/**
 * @module wireup
 *
 * Wireup a data provider to the rules-engine
 */

const moment = require('moment');
const registrationUtils = require('@medic/registration-utils');

const TaskStates = require('./task-states');
const refreshRulesEmissions = require('./refresh-rules-emissions');
const rulesEmitter = require('./rules-emitter');
const rulesStateStore = require('./rules-state-store');
const updateTemporalStates = require('./update-temporal-states');
const calendarInterval = require('@medic/calendar-interval');

let wireupOptions;

module.exports = {
  /**
   * @param {Object} provider A data provider
   * @param {Object} settings Settings for the behavior of the provider
   * @param {Object} settings.rules Rules code from settings doc
   * @param {Object[]} settings.taskSchedules Task schedules from settings doc
   * @param {Object[]} settings.targets Target definitions from settings doc
   * @param {Boolean} settings.enableTasks Flag to enable tasks
   * @param {Boolean} settings.enableTargets Flag to enable targets
   * @param {String} settings.emitter Rules-emitter to use (either 'nools' or 'metal')
   * @param {number} settings.monthStartDate reporting interval start date
   * @param {Object} userDoc User's hydrated contact document
   */
  initialize: (provider, settings) => {
    const isEnabled = rulesEmitter.initialize(settings);
    if (!isEnabled) {
      return Promise.resolve();
    }

    const { enableTasks=true, enableTargets=true } = settings;
    wireupOptions = { enableTasks, enableTargets };

    return provider
      .existingRulesStateStore()
      .then(existingStateDoc => {
        if (!rulesEmitter.isLatestNoolsSchema()) {
          throw Error('Rules Engine: Updates to the nools schema are required');
        }

        const contactClosure = updatedState => provider.stateChangeCallback(
          existingStateDoc,
          { rulesStateStore: updatedState }
        );
        const needsBuilding = rulesStateStore.load(existingStateDoc.rulesStateStore, settings, contactClosure);
        return handleIntervalTurnover(provider, settings).then(() => {
          if (!needsBuilding) {
            return;
          }

          rulesStateStore.build(settings, contactClosure);
        });
      });
  },

  /**
   * Refreshes the rules emissions for all contacts
   * Fetches all tasks in non-terminal state owned by the contacts
   * Updates the temporal states of the task documents
   * Commits those changes (async)
   *
   * @param {Object} provider A data provider
   * @param {string[]} contactIds An array of contact ids. If undefined, returns tasks for all contacts
   * @returns {Promise<Object[]>} All the fresh task docs owned by contacts
   */
  fetchTasksFor: (provider, contactIds) => {
    if (!rulesEmitter.isEnabled() || !wireupOptions.enableTasks) {
      return disabledResponse();
    }

    return enqueue(() => {
      const calculationTimestamp = Date.now();
      return refreshRulesEmissionForContacts(provider, calculationTimestamp, contactIds)
        .then(() => contactIds ? provider.tasksByRelation(contactIds, 'owner') : provider.allTasks('owner'))
        .then(tasksToDisplay => {
          const docsToCommit = updateTemporalStates(tasksToDisplay, calculationTimestamp);
          provider.commitTaskDocs(docsToCommit);
          return tasksToDisplay.filter(taskDoc => taskDoc.state === TaskStates.Ready);
        });
    });
  },

  /**
   * Returns a breakdown of task counts by state and title for the provided contacts, or all contacts
   * Does NOT refresh rules emissions
   * @param {Object} provider A data provider
   * @param {string[]} contactIds An array of contact ids. If undefined, returns breakdown for all contacts
   * @return {Promise<{
   *  Ready: number,
   *  Draft: number,
   *  Failed: number,
   *  Completed: number,
   *  Cancelled: number,
   *}>}
   */
  fetchTasksBreakdown: (provider, contactIds) => {
    const tasksByState = Object.assign({}, TaskStates.states);
    Object
      .keys(tasksByState)
      .forEach(state => tasksByState[state] = 0);

    if (!rulesEmitter.isEnabled() || !wireupOptions.enableTasks) {
      return Promise.resolve(tasksByState);
    }

    const getTasks = contactIds ? provider.allTaskRowsByOwner(contactIds) : provider.allTaskRows();

    return getTasks.then(taskRows => {
      taskRows.forEach(({ value: { state } }) => {
        if (Object.hasOwnProperty.call(tasksByState, state)) {
          tasksByState[state]++;
        }
      });

      return tasksByState;
    });
  },

  /**
   * Refreshes the rules emissions for all contacts
   *
   * @param {Object} provider A data provider
   * @param {Object} filterInterval Target emissions with date within the interval will be aggregated into the target
   *    scores
   * @param {Integer} filterInterval.start Start timestamp of interval
   * @param {Integer} filterInterval.end End timestamp of interval
   * @returns {Promise<Object>} The fresh aggregate target doc
   */
  fetchTargets: (provider, filterInterval) => {
    if (!rulesEmitter.isEnabled() || !wireupOptions.enableTargets) {
      return disabledResponse();
    }

    const calculationTimestamp = Date.now();
    const targetEmissionFilter = filterInterval && (emission => {
      // 4th parameter of isBetween represents inclusivity. By default or using ( is exclusive, [ is inclusive
      return moment(emission.date).isBetween(filterInterval.start, filterInterval.end, null, '[]');
    });

    return enqueue(() => {
      return refreshRulesEmissionForContacts(provider, calculationTimestamp)
        .then(() => {
          const targets = rulesStateStore.aggregateStoredTargetEmissions(targetEmissionFilter);
          return storeTargetsDoc(provider, targets, filterInterval).then(() => targets);
        });
    });
  },

  /**
   * Indicate that the rules emissions associated with a given subjectId are dirty
   *
   * @param {Object} provider A data provider
   * @param {string[]} subjectIds An array of subject ids
   *
   * @returns {Promise} To complete the transaction marking the subjectIds as dirty
   */
  updateEmissionsFor: (provider, subjectIds) => {
    if (!subjectIds) {
      subjectIds = [];
    }

    if (subjectIds && !Array.isArray(subjectIds)) {
      subjectIds = [subjectIds];
    }

    // this function accepts subject ids, but rulesStateStore accepts a contact id, so a conversion is required
    return provider.contactsBySubjectId(subjectIds)
      .then(contactIds => rulesStateStore.markDirty(contactIds));
  },
};

let refreshQueue = Promise.resolve();
const enqueue = callback => {
  const listeners = [];
  const eventQueue = [];
  const emit = evtName => {
    // we have to emit `queued` immediately, but there are no listeners listening at this point
    // eventQueue will keep a list of listener-less events. when listeners are registered, we check if they
    // have events in eventQueue, and call their callback immediately for each matching queued event.
    if (!listeners[evtName]) {
      return eventQueue.push(evtName);
    }
    listeners[evtName].forEach(callback => callback());
  };

  emit('queued');
  refreshQueue = refreshQueue.then(() => {
    emit('running');
    return callback();
  });

  refreshQueue.on = (evtName, callback) => {
    listeners[evtName] = listeners[evtName] || [];
    listeners[evtName].push(callback);
    eventQueue.forEach(queuedEvent => queuedEvent === evtName && callback());
    return refreshQueue;
  };

  return refreshQueue;
};

const disabledResponse = () => {
  const p = Promise.resolve([]);
  p.on = () => p;
  return p;
};

const refreshRulesEmissionForContacts = (provider, calculationTimestamp, contactIds) => {
  const refreshAndSave = (freshData, updatedContactIds) => (
    refreshRulesEmissions(freshData, calculationTimestamp, wireupOptions)
      .then(refreshed => Promise.all([
        rulesStateStore.storeTargetEmissions(updatedContactIds, refreshed.targetEmissions),
        provider.commitTaskDocs(refreshed.updatedTaskDocs),
      ]))
  );

  const refreshForAllContacts = (calculationTimestamp) => (
    provider.allTaskData(rulesStateStore.currentUserSettings())
      .then(freshData => (
        refreshAndSave(freshData)
          .then(() => {
            const contactIds = freshData.contactDocs.map(doc => doc._id);

            const subjectIds = freshData.contactDocs.reduce((agg, contactDoc) => {
              registrationUtils.getSubjectIds(contactDoc).forEach(subjectId => agg.add(subjectId));
              return agg;
            }, new Set());

            const headlessSubjectIds = freshData.reportDocs
              .map(doc => registrationUtils.getSubjectId(doc))
              .filter(subjectId => !subjectIds.has(subjectId));

            rulesStateStore.markAllFresh(calculationTimestamp, [...contactIds, ...headlessSubjectIds]);
          })
      ))
  );

  const refreshForKnownContacts = (calculationTimestamp, contactIds) => {
    const dirtyContactIds = contactIds.filter(contactId => rulesStateStore.isDirty(contactId));
    return provider.taskDataFor(dirtyContactIds, rulesStateStore.currentUserSettings())
      .then(freshData => refreshAndSave(freshData, dirtyContactIds))
      .then(() => {
        rulesStateStore.markFresh(calculationTimestamp, dirtyContactIds);
      });
  };

  return handleIntervalTurnover(provider, { monthStartDate: rulesStateStore.getMonthStartDate() }).then(() => {
    if (contactIds) {
      return refreshForKnownContacts(calculationTimestamp, contactIds);
    }

    // If the contact state store does not contain all contacts, build up that list (contact doc ids + headless ids in
    // reports/tasks)
    if (!rulesStateStore.hasAllContacts()) {
      return refreshForAllContacts(calculationTimestamp);
    }

    // Once the contact state store has all contacts, trust it and only refresh those marked dirty
    return refreshForKnownContacts(calculationTimestamp, rulesStateStore.getContactIds());
  });
};

const storeTargetsDoc = (provider, targets, filterInterval, force = false) => {
  const targetDocTag = filterInterval ? moment(filterInterval.end).format('YYYY-MM') : 'latest';
  const minifyTarget = target => ({ id: target.id, value: target.value });

  return provider.commitTargetDoc(
    targets.map(minifyTarget),
    rulesStateStore.currentUserContact(),
    rulesStateStore.currentUserSettings(),
    targetDocTag,
    force
  );
};

// Because we only save the `target` document once per day (when we calculate targets for the first time),
// we're losing all updates to targets that happened in the last day of the reporting period.
// This function takes the last saved state (which may be stale) and generates the targets doc for the corresponding
// reporting interval (that includes the date when the state was calculated).
// We don't recalculate the state prior to this because we support targets that count events infinitely to emit `now`,
// which means that they would all be excluded from the emission filter (being outside the past reporting interval).
// https://github.com/medic/cht-core/issues/6209
const handleIntervalTurnover = (provider, { monthStartDate }) => {
  if (!rulesStateStore.isLoaded() || !wireupOptions.enableTargets) {
    return Promise.resolve();
  }

  const stateCalculatedAt = rulesStateStore.stateLastUpdatedAt();
  if (!stateCalculatedAt) {
    return Promise.resolve();
  }

  const currentInterval = calendarInterval.getCurrent(monthStartDate);
  // 4th parameter of isBetween represents inclusivity. By default or using ( is exclusive, [ is inclusive
  if (moment(stateCalculatedAt).isBetween(currentInterval.start, currentInterval.end, null, '[]')) {
    return Promise.resolve();
  }

  const filterInterval = calendarInterval.getInterval(monthStartDate, stateCalculatedAt);
  const targetEmissionFilter = (emission => {
    // 4th parameter of isBetween represents inclusivity. By default or using ( is exclusive, [ is inclusive
    return moment(emission.date).isBetween(filterInterval.start, filterInterval.end, null, '[]');
  });

  const targets = rulesStateStore.aggregateStoredTargetEmissions(targetEmissionFilter);
  return storeTargetsDoc(provider, targets, filterInterval, true);
};
