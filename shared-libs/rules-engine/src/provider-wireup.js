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
   * @param {Boolean} [settings.rulesAreDeclarative=true] Flag to indicate the content of settings.rules. When true,
   * rules is processed as native JavaScript. When false, nools is used.
   * @param {RulesEmitter} [settings.customEmitter] Optional custom RulesEmitter object
   * @param {number} settings.monthStartDate reporting interval start date
   * @param {Object} userDoc User's hydrated contact document
   */
  initialize: async (provider, settings) => {
    const isEnabled = rulesEmitter.initialize(settings);
    if (!isEnabled) {
      return Promise.resolve();
    }

    const { enableTasks=true, enableTargets=true } = settings;
    wireupOptions = { enableTasks, enableTargets };

    const existingStateDoc = await provider.existingRulesStateStore();
    if (!rulesEmitter.isLatestNoolsSchema()) {
      throw Error('Rules Engine: Updates to the nools schema are required');
    }

    const contactClosure = updatedState => provider.stateChangeCallback(
      existingStateDoc,
      { rulesStateStore: updatedState }
    );
    const needsBuilding = rulesStateStore.load(existingStateDoc.rulesStateStore, settings, contactClosure);
    if (!needsBuilding) {
      return;
    }

    rulesStateStore.build(settings, contactClosure);
  },

  /**
   * Refreshes the rules emissions for all provided contacts
   * Writes target document if changed
   *
   * @param {Object} provider A data provider
   * @param {string[]} contactIds An array of contact ids. If undefined, refreshes emissions for all contacts
   * @returns {Promise<>}
   */
  refreshEmissionsFor: (provider, contactIds) => {
    if (!rulesEmitter.isEnabled()) {
      return disabledResponse();
    }

    return enqueue(async () => {
      const calculationTimestamp = Date.now();
      await refreshRulesEmissionForContacts(provider, calculationTimestamp, contactIds);
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

    return enqueue(async () => {
      await refreshRulesEmissionForContacts(provider, Date.now());
      const aggregate = await rulesStateStore.getTargetAggregates(filterInterval);
      return aggregate.targets;
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

    subjectIds = [...new Set(subjectIds)];

    // this function accepts subject ids, but rulesStateStore accepts a contact id, so a conversion is required
    return enqueue(async () => {
      const contactIds = await provider.contactsBySubjectId(subjectIds);
      await rulesStateStore.markDirty(contactIds);
      await refreshRulesEmissionForContacts(provider, Date.now(), contactIds);
    });
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

const storeTargetEmissions = async (provider, updatedContactIds, targetEmissions) => {
  await rulesStateStore.storeTargetEmissions(updatedContactIds, targetEmissions);
  const { aggregate, isUpdated } = await rulesStateStore.aggregateStoredTargetEmissions();
  await storeTargetsDoc(provider, aggregate, isUpdated);
};

const refreshRulesEmissionForContacts = (provider, calculationTimestamp, contactIds) => {
  const refreshAndSave = async (freshData, updatedContactIds) => {
    const refreshed = await refreshRulesEmissions(freshData, calculationTimestamp, wireupOptions);
    await provider.commitTaskDocs(refreshed.updatedTaskDocs);
    await storeTargetEmissions(provider, updatedContactIds, refreshed.targetEmissions);
  };

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
};

const storeTargetsDoc = (provider, aggregate, updatedTargets) => {
  const targetDocTag = aggregate.filterInterval ? moment(aggregate.filterInterval.end).format('YYYY-MM') : 'latest';
  const minifyTarget = target => ({ id: target.id, value: target.value });
  const userContext = {
    userContactDoc: rulesStateStore.currentUserContact(),
    userSettingsDoc: rulesStateStore.currentUserSettings(),
  };

  return provider.commitTargetDoc(
    aggregate.targets.map(minifyTarget),
    targetDocTag,
    userContext,
    updatedTargets
  );
};

