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
 * @param {Object[]} freshData.userContactId The id of the user's contact document
 * @param {int} calculationTimestamp Timestamp for the round of rules calculations
 *
 * @returns {Object} result
 * @returns {Object[]} result.targetEmissions Array of raw target emissions
 * @returns {Object[]} result.updatedTaskDocs Array of updated task documents
 */
module.exports = (freshData = {}, calculationTimestamp = Date.now()) => (
  calculateFreshTaskDocs(freshData, calculationTimestamp)
    .then(freshResults => {
      const freshTaskDocs = freshResults.taskTransforms.map(doc => doc.taskDoc);
      const cancelledDocs = getCancellationUpdates(freshTaskDocs, freshData.taskDocs, calculationTimestamp);
      const updatedTaskDocs = freshResults.taskTransforms.filter(doc => doc.isUpdated).map(result => result.taskDoc);
      return {
        targetEmissions: freshResults.targetEmissions,
        updatedTaskDocs: [...updatedTaskDocs, ...cancelledDocs],
      };
    })
);

const calculateFreshTaskDocs = (freshData, calculationTimestamp) => {
  const { contactDocs = [], reportDocs = [], taskDocs = [], userContactId } = freshData;
  if (contactDocs.length === 0 && reportDocs.length === 0 && taskDocs.length === 0) {
    return Promise.resolve({
      targetEmissions: [],
      taskTransforms: [],
    });
  }

  const emissionIdToLatestDocMap = mapEmissionIdToLatestTaskDoc(taskDocs);
  return rulesEmitter.getEmissionsFor(contactDocs, reportDocs, taskDocs)
    .then(emissions => {
      const taskTransforms = disambiguateEmissions(emissions.tasks, calculationTimestamp)
        // Reviewer: Should the webapp also filter task emissions is some way? Or leave it completely up to Utils.IsTimely?
        .map(taskEmission => {
          const existingDoc = emissionIdToLatestDocMap[taskEmission._id];
          return transformTaskEmissionToDoc(taskEmission, calculationTimestamp, userContactId, existingDoc);
        });
     
      return {
        targetEmissions: emissions.targets || [],
        taskTransforms,
      };
    });
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

const mapEmissionIdToLatestTaskDoc = taskDocs => taskDocs
    .reduce((agg, doc) => {
    const emissionId = doc.emission._id;
    if (!agg[emissionId] || agg[emissionId].authoredOn < doc.authoredOn) {
      agg[emissionId] = doc;
    }

    return agg;
  }, {});
