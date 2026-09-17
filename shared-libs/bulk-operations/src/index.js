const config = require('./libs/config');
const db = require('./libs/db');
const dataContext = require('./libs/data-context');
const lineage = require('./libs/lineage');
const deleteContact = require('./delete-contact');
const moveContact = require('./move-contact');
const { ValidationError } = require('./errors');
const { BULK_OPERATIONS } = require('@medic/constants');

const { TYPES } = BULK_OPERATIONS;

// Keyed by the operation type recorded on the log, so Sentinel can plan an operation without knowing
// anything about deletes or moves.
const PLANNERS = {
  [TYPES.DELETE_CONTACT]: deleteContact,
  [TYPES.MOVE_CONTACT]: moveContact,
};

const getPlanner = (type) => {
  const planner = PLANNERS[type];
  if (!planner) {
    throw new Error(`bulk-operations: no planner for type "${type}"`);
  }
  return planner;
};

module.exports = (sourceConfig, sourceDb, sourceDataContext) => {
  config.init(sourceConfig);
  db.init(sourceDb);
  dataContext.init(sourceDataContext);
  lineage.init(require('@medic/lineage')(Promise, db.medic));

  return {
    /**
     * Checks that an operation can legally run, against the documents as they are now.
     * @param {string} type - the operation type, one of `BULK_OPERATIONS.TYPES`
     * @param {Object} params - the request parameters recorded on the log
     * @throws {ValidationError} when the operation would be illegal
     */
    validate: async (type, params) => getPlanner(type).validate(params),

    /**
     * Works out everything an operation touches. Assumes `validate` has passed.
     * @param {string} type - the operation type, one of `BULK_OPERATIONS.TYPES`
     * @param {Object} params - the request parameters recorded on the log
     * @returns {Promise<Object>} the summary of changes and the actions to run, in execution order
     */
    plan: async (type, params) => getPlanner(type).plan(params),

    ValidationError,
  };
};
