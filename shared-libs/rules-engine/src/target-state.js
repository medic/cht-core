/**
 * @module target-state
 *
 * Stores raw target-emissions in a minified, efficient, deterministic structure
 * Handles removal of "cancelled" target emissions
 * Aggregates target emissions into targets
 */

/** @summary state
 * Functions in this module all accept a "state" parameter or return a "state" object.
 * This state has the following structure:
 *
 * @example
 * {
 *   target.id: {
 *     id: 'target_id',
 *     type: 'count',
 *     goal: 0,
 *     ..
 *
 *     emissions: {
 *       emission.id: {
 *         requestor.id: {
 *           pass: boolean,
 *           date: timestamp,
 *           order: timestamp,
 *         },
 *         ..
 *       },
 *       ..
 *     }
 *   },
 *   ..
 * }
 */

const moment = require('moment/moment');

const clearEmissions = (state, contactIds) => {
  if (!contactIds) {
    for (const targetId of Object.keys(state.targets)) {
      state.targets[targetId].emissions = {};
    }
    return true;
  }

  return clearEmissionsForContacts(state, contactIds);
};

const clearTargetEmissionsForContact = (emissions, contactId) => {
  let isUpdated;
  for (const emissionId of Object.keys(emissions)) {
    const emission = emissions[emissionId];
    if (emission[contactId]) {
      delete emission[contactId];
      isUpdated = true;
    }
  }

  return isUpdated;
};

const clearEmissionsForContact = (state, contactId) => {
  let isUpdated = false;
  for (const targetId of Object.keys(state.targets)) {
    isUpdated = clearTargetEmissionsForContact(state.targets[targetId].emissions, contactId) || isUpdated;
  }
  return isUpdated;
};

const clearEmissionsForContacts = (state, contactIds) => {
  let isUpdated = false;

  for (const contactId of contactIds) {
    isUpdated = clearEmissionsForContact(state, contactId) || isUpdated;
  }

  return isUpdated;
};

const mergeEmissions = (state, contactIds, targetEmissions) => {
  let isUpdated = false;

  for (const emission of targetEmissions) {
    const target = state.targets[emission.type];
    const requestor = emission?.contact?._id;

    if (target && requestor && !emission.deleted) {
      const targetRequestors = target.emissions[emission._id] = target.emissions[emission._id] || {};
      targetRequestors[requestor] = {
        pass: !!emission.pass,
        groupBy: emission.groupBy,
        date: emission.date,
        order: emission.contact.reported_date || -1,
      };
      isUpdated = true;
    }
  }

  return isUpdated;
};

const createState = (existentStaleState) => {
  return {
    targets: existentStaleState ? existentStaleState : {},
    aggregate: {}
  };
};

/**
 * Serializes a function into a string representation.
 * @param {Function} fn - The function to serialize
 * @returns {string} - The serialized function string
 */
const serializeFunction = (fn) => {
  if (typeof fn !== 'function') {
    return fn;
  }

  const fnString = fn.toString();

  // Check for unsafe patterns
  const forbidden = /(require|process|global|import|eval|while|for\s*\()/g;
  if (forbidden.test(fnString)) {
    // console.warn('Blocked unsafe function serialization:', fnString);
    return fnString;
  }

  return fnString;
};

/**
 * Deserializes a function string back into a function.
 * @param {string} fnString - The serialized function string
 * @returns {Function|string} - The deserialized function or original string if invalid
 */
const deserializeFunction = (fnString) => {
  if (!isValidFunctionString(fnString)) {
    return fnString;
  }

  const { args, body } = splitFunctionString(fnString);
  const cleanedArgs = cleanArgs(args);

  try {
    return body.startsWith('{')
      ? new Function(cleanedArgs, body)               // Block body
      : new Function(cleanedArgs, `return (${body});`); // Expression body
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to deserialize function:', err, fnString);
    return fnString;
  }
};

/**
 * Checks if a string represents a valid function.
 * @param {string} fnString - The string to check
 * @returns {boolean} - True if valid function string
 */
const isValidFunctionString = (fnString) => {
  if (typeof fnString !== 'string') {
    return false;
  }
  if (!fnString.includes('=>')) {
    return false;
  }

  // Grouping fixes Sonar's regex warning
  const forbidden = /(require|process|global|import|eval|while|for\s*\()/g;

  if (forbidden.test(fnString)) {
    // console.warn('Blocked unsafe function:', fnString);
    return false;
  }
  return true;
};

/**
 * Splits a function string into args and body.
 * @param {string} fnString - The function string
 * @returns {Object} - Object with args and body properties
 */
const splitFunctionString = (fnString) => {
  const arrowIndex = fnString.indexOf('=>');
  const args = fnString.slice(0, arrowIndex).trim();
  const body = fnString.slice(arrowIndex + 2).trim();
  return { args, body };
};

/**
 * Cleans function arguments by removing parentheses.
 * @param {string} args - The arguments string
 * @returns {string} - Cleaned arguments
 */
const cleanArgs = (args) => {
  return args.replace(/[()]/g, '').trim();
};

module.exports = {
  /**
   * Builds an empty target-state.
   *
   * @param {Object[]} targets An array of target definitions
   */
  createEmptyState: (targets=[]) => {
    const state = createState();

    targets.forEach(definition => state.targets[definition.id] = { ...definition, emissions: {} });
    return state;
  },

  isStale: (state) => !state || !state.targets || !state.aggregate,
  migrateStaleState: (state) => module.exports.isStale(state) ? createState(state) : state,

  storeTargetEmissions: (state, contactIds, targetEmissions) => {
    let isUpdated = false;
    if (!Array.isArray(targetEmissions)) {
      throw Error('targetEmissions argument must be an array');
    }

    // Remove all emissions that were previously emitted by the contact ("cancelled emissions")
    isUpdated = clearEmissions(state, contactIds);

    // Merge the emission data into state
    isUpdated = mergeEmissions(state, contactIds, targetEmissions) || isUpdated;

    return isUpdated;
  },

  aggregateStoredTargetEmissions: (state, filterInterval, updateState) => {
    const targetEmissionFilter = (emission => {
      const INCLUSIVE_START_AND_END = '[]';
      return moment(emission.date).isBetween(filterInterval.start, filterInterval.end, null, INCLUSIVE_START_AND_END);
    });

    const pick = (obj, attrs) => attrs
      .reduce((agg, attr) => {
        if (Object.hasOwnProperty.call(obj, attr)) {
          agg[attr] = obj[attr];
        }
        return agg;
      }, {});

    const scoreTarget = target => {
      const emissionIds = Object.keys(target.emissions);
      const relevantEmissions = emissionIds
        // emissions passing the "targetEmissionFilter"
        .map(emissionId => {
          const requestorIds = Object.keys(target.emissions[emissionId]);
          const filteredInstanceIds = requestorIds.filter(requestorId => {
            return !targetEmissionFilter || targetEmissionFilter(target.emissions[emissionId][requestorId]);
          });
          return pick(target.emissions[emissionId], filteredInstanceIds);
        })

        // if there are multiple emissions with the same id emitted by different contacts, disambiguate them
        .map(emissionsByRequestor => emissionOfLatestRequestor(emissionsByRequestor))
        .filter(emission => emission);

      const passingThreshold = target.passesIfGroupCount && target.passesIfGroupCount.gte;
      if (!passingThreshold) {
        return {
          pass: relevantEmissions.filter(emission => emission.pass).length,
          total: relevantEmissions.length,
        };
      }

      const countPassedEmissionsByGroup = {};
      const countEmissionsByGroup = {};

      relevantEmissions.forEach(emission => {
        const groupBy = emission.groupBy;
        if (!groupBy) {
          return;
        }
        if (!countPassedEmissionsByGroup[groupBy]) {
          countPassedEmissionsByGroup[groupBy] = 0;
          countEmissionsByGroup[groupBy] = 0;
        }
        countEmissionsByGroup[groupBy]++;
        if (emission.pass) {
          countPassedEmissionsByGroup[groupBy]++;
        }
      });

      const groups = Object.keys(countEmissionsByGroup);

      return {
        pass: groups.filter(group => countPassedEmissionsByGroup[group] >= passingThreshold).length,
        total: groups.length,
      };
    };

    const aggregateTarget = target => {
      const aggregated = pick(
        target,
        ['id', 'type', 'goal', 'translation_key', 'name', 'icon', 'subtitle_translation_key', 'visible']
      );
      aggregated.value = scoreTarget(target);

      if (aggregated.type === 'percent') {
        aggregated.value.percent = aggregated.value.total ?
          Math.round(aggregated.value.pass * 100 / aggregated.value.total) : 0;
      }

      return aggregated;
    };

    const emissionOfLatestRequestor = emissionsByRequestor => {
      return Object.keys(emissionsByRequestor).reduce((previousValue, requestorId) => {
        const current = emissionsByRequestor[requestorId];
        if (!previousValue || !previousValue.order || current.order > previousValue.order) {
          return current;
        }
        return previousValue;
      }, undefined);
    };

    const aggregate = {
      filterInterval,
      targets: Object.keys(state.targets).map(targetId => aggregateTarget(state.targets[targetId]))
    };

    if (!updateState) {
      return { aggregate, isUpdated: false };
    }

    const isUpdated = !!aggregate.targets.find(target => {
      const stateTarget = state.aggregate?.targets?.find(stateTarget => stateTarget.id === target.id);
      return stateTarget?.value.pass !== target.value.pass || stateTarget?.value.total !== target.value.total;
    });
    state.aggregate = aggregate;

    return { aggregate, isUpdated };
  },

  serializeFunction,
  deserializeFunction,
};
