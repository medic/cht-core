const db = require('../db');
const config = require('../config');
const dataContext = require('./data-context');
const { BadRequestError } = require('../errors');

const planners = require('@medic/bulk-operations')(config, db, dataContext);

/**
 * An operation the planner refused is the caller's mistake, not a server error, so it is reported as
 * a 400. Anything else propagates untouched and surfaces as a 500.
 */
const asBadRequest = async (promise) => {
  try {
    return await promise;
  } catch (err) {
    if (err instanceof planners.ValidationError) {
      throw new BadRequestError(err.message);
    }
    throw err;
  }
};

module.exports = {
  validate: (type, params) => asBadRequest(planners.validate(type, params)),
  plan: (type, params) => asBadRequest(planners.plan(type, params)),
};
