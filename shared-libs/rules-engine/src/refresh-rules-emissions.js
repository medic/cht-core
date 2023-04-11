/**
 * @module refresh-rules-emissions
 * Uses rules-emitter to calculate the fresh emissions for a set of contacts, their reports, and their tasks
 * Creates or updates one task document per unique emission id
 * Cancels task documents in non-terminal states if they were not emitted
 *
 * @requires rules-emitter to be initialized
 */

const rulesEmitter = require('./rules-emitter');
const TaskStates = require('./task-states');
const transformTaskEmissionToDoc = require('./transform-task-emission-to-doc');

/**
 * @param {Object[]} freshData.contactDocs A set of contact documents
 * @param {Object[]} freshData.reportDocs All of the contacts' reports
 * @param {Object[]} freshData.taskDocs All of the contacts' task documents (must be linked by requester to a contact)
 * @param {Object[]} freshData.userSettingsId The id of the user's settings document
 *
 * @param {int} calculationTimestamp Timestamp for the round of rules calculations
 *
 * @param {Object=} [options] Options for the behavior when refreshing rules
 * @param {Boolean} [options.enableTasks=true] Flag to enable tasks
 * @param {Boolean} [options.enableTargets=true] Flag to enable targets
 *
 * @returns {Object} result
 * @returns {Object[]} result.targetEmissions Array of raw target emissions
 * @returns {Object[]} result.updatedTaskDocs Array of updated task documents
 */
module.exports = (freshData = {}, calculationTimestamp = Date.now(), { enableTasks=true, enableTargets=true }={}) => {
  const { contactDocs = [], reportDocs = [], taskDocs = [] } = freshData;
  return rulesEmitter.getEmissionsFor(contactDocs, reportDocs, taskDocs)
    .then(emissions => Promise.all([
      enableTasks ? getUpdatedTaskDocs(emissions.tasks, freshData, calculationTimestamp, enableTasks) : [],
      enableTargets ? emissions.targets : [],
    ]))
    .then(([updatedTaskDocs, targetEmissions]) => ({ updatedTaskDocs, targetEmissions }));
};

const getUpdatedTaskDocs = (taskEmissions, freshData, calculationTimestamp) => {
  const { taskDocs = [], userSettingsId } = freshData;
  const { winners: emissionIdToLatestDocMap, duplicates: duplicateTaskDocs } = disambiguateTaskDocs(
    taskDocs,
    calculationTimestamp
  );

  const timelyEmissions  = taskEmissions.filter(emission => TaskStates.isTimely(emission, calculationTimestamp));
  const taskTransforms = disambiguateEmissions(timelyEmissions, calculationTimestamp)
    .map(taskEmission => {
      const existingDoc = emissionIdToLatestDocMap[taskEmission._id];
      return transformTaskEmissionToDoc(taskEmission, calculationTimestamp, userSettingsId, existingDoc);
    });

  const freshTaskDocs = taskTransforms.map(doc => doc.taskDoc);
  const cancelledDocs = getCancellationUpdates(freshTaskDocs, freshData.taskDocs, calculationTimestamp);
  const cancelledDuplicatedDocs = getDeduplicationUpdates(duplicateTaskDocs, calculationTimestamp);
  const updatedTaskDocs = taskTransforms.filter(doc => doc.isUpdated).map(result => result.taskDoc);
  return [...updatedTaskDocs, ...cancelledDocs, ...cancelledDuplicatedDocs];
};

/**
 * Examine the existing task documents which were previously emitted by the same contact
 * Cancel any doc that is in a non-terminal state and does not have an emission to keep it alive
 */
const getCancellationUpdates = (freshDocs, existingTaskDocs = [], calculatedAt = 0) => {
  const existingNonTerminalTaskDocs = existingTaskDocs.filter(doc => !TaskStates.isTerminal(doc.state));
  const currentEmissionIds = new Set(freshDocs.map(doc => doc.emission._id));

  return existingNonTerminalTaskDocs
    .filter(doc => !currentEmissionIds.has(doc.emission._id))
    .map(doc => TaskStates.setStateOnTaskDoc(doc, TaskStates.Cancelled, calculatedAt));
};

/**
 * All duplicate task docs that are not in a terminal state are "Cancelled" with a "duplicate" reason
 * @param {Array} duplicatedTaskDocs - array of task docs that exist in the local DB
 * @param {number} calculatedAt - Timestamp for the round of rules calculations
 * @returns {Array} - task docs with updated state
 */
const getDeduplicationUpdates = (duplicatedTaskDocs, calculatedAt) => {
  return duplicatedTaskDocs
    .filter(doc => !TaskStates.isTerminal(doc.state))
    .map(doc => TaskStates.setStateOnTaskDoc(doc, TaskStates.Cancelled, calculatedAt, 'duplicate'));
};

/*
It is possible to receive multiple emissions with the same id. When this happens, we need to pick one winner.
We pick the "most ready" emission.
*/
const disambiguateEmissions = (taskEmissions, forTime) => {
  const winners = taskEmissions.reduce((agg, emission) => {
    if (!agg[emission._id]) {
      agg[emission._id] = emission;
    } else {
      const incomingState = TaskStates.calculateState(emission, forTime) || TaskStates.Cancelled;
      const currentState = TaskStates.calculateState(agg[emission._id], forTime) || TaskStates.Cancelled;
      if (TaskStates.isMoreReadyThan(incomingState, currentState)) {
        agg[emission._id] = emission;
      }
    }
    return agg;
  }, {});

  return Object.keys(winners).map(key => winners[key]); // Object.values()
};

/**
 * It's possible to have multiple task docs with the same emission id. (For example, when the same account logs in
 * on multiple devices). When this happens, we pick the "most ready" most recent task. However, tasks that are authored
 * in the future are discarded.
 * @param {Array} taskDocs - An array of already exiting task documents
 * @param {number} forTime - current calculation timestamp
 * @returns {Object} result
 * @returns {Object} result.winners - A map of emission id to task pairs
 * @returns {Array} result.duplicates - A list of task documents that are duplicates and need to be cancelled
 */
const disambiguateTaskDocs = (taskDocs, forTime) => {
  const duplicates = [];
  const winners = {};

  const taskDocsByEmissionId = mapEmissionIdToTaskDocs(taskDocs, forTime);

  Object.keys(taskDocsByEmissionId).forEach(emissionId => {
    taskDocsByEmissionId[emissionId].forEach(taskDoc => {
      if (!winners[emissionId]) {
        winners[emissionId] = taskDoc;
        return;
      }

      const stateComparison = TaskStates.compareState(taskDoc.state, winners[emissionId].state);
      if (
        // if taskDoc is more ready
        stateComparison < 0 ||
        // or taskDoc is more recent, when having the same state
        (stateComparison === 0 && taskDoc.authoredOn > winners[emissionId].authoredOn)
      ) {
        duplicates.push(winners[emissionId]);
        winners[emissionId] = taskDoc;
      } else {
        duplicates.push(taskDoc);
      }
    });
  });

  return { winners, duplicates };
};

const mapEmissionIdToTaskDocs = (taskDocs, maxTimestamp) => {
  const tasksByEmission = {};
  taskDocs
    // mitigate the fallout of a user who rewinds their system-clock after creating task docs
    .filter(doc => doc.authoredOn <= maxTimestamp)
    .forEach(doc => {
      const emissionId = doc.emission._id;
      if (!tasksByEmission[emissionId]) {
        tasksByEmission[emissionId] = [];
      }
      tasksByEmission[emissionId].push(doc);
    });
  return tasksByEmission;
};
