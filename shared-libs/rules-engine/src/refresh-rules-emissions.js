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
/*

const getUpdatedTaskDocs = (taskEmissions, freshData, calculationTimestamp) => {
  const { taskDocs = [], userSettingsId } = freshData;
  const emissionIdToLatestDocMap = mapEmissionIdToLatestTaskDoc(taskDocs, calculationTimestamp);

  const timelyEmissions  = taskEmissions.filter(emission => TaskStates.isTimely(emission, calculationTimestamp));
  const taskTransforms = disambiguateEmissions(timelyEmissions, calculationTimestamp)
    .map(taskEmission => {
      const existingDoc = emissionIdToLatestDocMap[taskEmission._id];
      return transformTaskEmissionToDoc(taskEmission, calculationTimestamp, userSettingsId, existingDoc);
    });

  const freshTaskDocs = taskTransforms.map(doc => doc.taskDoc);
  const cancelledDocs = getCancellationUpdates(freshTaskDocs, freshData.taskDocs, calculationTimestamp);
  const updatedTaskDocs = taskTransforms.filter(doc => doc.isUpdated).map(result => result.taskDoc);
  return [...updatedTaskDocs, ...cancelledDocs];
};
*/

const getUpdatedTaskDocs = (taskEmissions, freshData, calculationTimestamp) => {
  const { taskDocs = [], userSettingsId } = freshData;
  const taskDocsByEmissionId = mapEmissionIdToTaskDocs(taskDocs);
  const { winners: emissionIdToLatestDocMap, taskDocsToDedupe } =
          disambiguateTaskDocs(taskDocsByEmissionId, calculationTimestamp);

  const timelyEmissions  = taskEmissions.filter(emission => TaskStates.isTimely(emission, calculationTimestamp));
  const taskTransforms = disambiguateEmissions(timelyEmissions, calculationTimestamp)
    .map(taskEmission => {
      const existingDoc = emissionIdToLatestDocMap[taskEmission._id];
      return transformTaskEmissionToDoc(taskEmission, calculationTimestamp, userSettingsId, existingDoc);
    });

  const freshTaskDocs = taskTransforms.map(doc => doc.taskDoc);
  const cancelledDocs = getCancellationUpdates(freshTaskDocs, freshData.taskDocs, calculationTimestamp);
  const dedupedTasks = getDedupeUpdates(taskDocsToDedupe, calculationTimestamp);
  const updatedTaskDocs = taskTransforms.filter(doc => doc.isUpdated).map(result => result.taskDoc);
  return [...updatedTaskDocs, ...cancelledDocs, ...dedupedTasks];
};

/**
 * Examine the existing task documents which were previously emitted by the same contact
 * Cancel any doc that is in a non-terminal state and does not have an emission to keep it alive
 */
const getCancellationUpdates = (freshDocs, existingTaskDocs = [], calculatedAt) => {
  const existingNonTerminalTaskDocs = existingTaskDocs.filter(doc => !TaskStates.isTerminal(doc.state));
  const currentEmissionIds = new Set(freshDocs.map(doc => doc.emission._id));

  return existingNonTerminalTaskDocs
    .filter(doc => !currentEmissionIds.has(doc.emission._id))
    .map(doc => TaskStates.setStateOnTaskDoc(doc, TaskStates.Cancelled, calculatedAt));
};


const getDedupeUpdates = (existingTaskDocs, calculatedAt) => {
  return existingTaskDocs
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

const disambiguateTaskDocs = (taskDocsByEmissionId, forTime) => {
  const taskDocsToDedupe = [];
  const winners = {};

  Object.keys(taskDocsByEmissionId).forEach(emissionId => {
    taskDocsByEmissionId[emissionId].forEach(taskDoc => {
      if (!winners[emissionId]) {
        winners[emissionId] = taskDoc;
      } else {
        const incomingState = TaskStates.calculateState(taskDoc, forTime) || TaskStates.Cancelled;
        const currentState = TaskStates.calculateState(winners[emissionId], forTime) || TaskStates.Cancelled;
        if (TaskStates.isMoreReadyThan(incomingState, currentState)) {
          taskDocsToDedupe.push(winners[emissionId]);
          winners[emissionId] = taskDoc;
        } else {
          taskDocsToDedupe.push(taskDoc);
        }
      }
    });
  });

  return { winners, taskDocsToDedupe };
};

const mapEmissionIdToTaskDocs = (taskDocs) => {
  const tasksByEmission = {};
  taskDocs.forEach(doc => {
    const emissionId = doc.emission._id;
    if (!tasksByEmission[emissionId]) {
      tasksByEmission[emissionId] = [];
    }

    tasksByEmission[emissionId].push(doc);
  });
  return tasksByEmission;
};

const mapEmissionIdToLatestTaskDoc = (taskDocs, maxTimestamp) => taskDocs
  // mitigate the fallout of a user who rewinds their system-clock after creating task docs
  .filter(doc => doc.authoredOn <= maxTimestamp)

  .reduce((agg, doc) => {
    const emissionId = doc.emission._id;
    if (!agg[emissionId] || agg[emissionId].authoredOn < doc.authoredOn) {
      agg[emissionId] = doc;
    }

    return agg;
  }, {});
