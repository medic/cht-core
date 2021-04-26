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

module.exports = {
  /**
   * Builds an empty target-state.
   *
   * @param {Object[]} targets An array of target definitions
   */
  createEmptyState: (targets=[]) => {
    return targets
      .reduce((agg, definition) => {
        agg[definition.id] = Object.assign({}, definition, { emissions: {} });
        return agg;
      }, {});
  },

  storeTargetEmissions: (state, contactIds, targetEmissions) => {
    let isUpdated = false;
    if (!Array.isArray(targetEmissions)) {
      throw Error('targetEmissions argument must be an array');
    }

    // Remove all emissions that were previously emitted by the contact ("cancelled emissions")
    if (!contactIds) {
      for (const targetId of Object.keys(state)) {
        state[targetId].emissions = {};
      }
    } else {
      for (const contactId of contactIds) {
        for (const targetId of Object.keys(state)) {
          for (const emissionId of Object.keys(state[targetId].emissions)) {
            const emission = state[targetId].emissions[emissionId];
            if (emission[contactId]) {
              delete emission[contactId];
              isUpdated = true;
            }
          }
        }
      }
    }

    // Merge the emission data into state
    for (const emission of targetEmissions) {
      const target = state[emission.type];
      const requestor = emission.contact && emission.contact._id;
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
  },

  aggregateStoredTargetEmissions: (state, targetEmissionFilter) => {
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

    return Object.keys(state).map(targetId => aggregateTarget(state[targetId]));
  },
};
