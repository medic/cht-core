/**
 * @module target-state
 *
 * Stores raw target-emissions in a minified, efficient, ordered (deterministic) structure
 * Allows for automatic deletion of "cancelled" target emissions
 * Aggregates target emissions into targets
 */

module.exports = {
  /**
   * Builds an empty target-state.
   *
   * @param {Object} settingsDoc Settings document
   */
  empty: (settingsDoc) => {
    const targetDefinitions = settingsDoc.tasks && settingsDoc.tasks.targets && settingsDoc.tasks.targets.items || [];
    return targetDefinitions.reduce((agg, definition) => {
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
      for (let targetId of Object.keys(state)) {
        state[targetId].emissions = {};
      }
    } else {
      for (let contactId of contactIds) {
        for (let targetId of Object.keys(state)) {
          for (let emissionId of Object.keys(state[targetId].emissions)) {
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
    for (let emission of targetEmissions) {
      const target = state[emission.type];
      const requestor = emission.contact && emission.contact._id;
      if (target && requestor && !emission.deleted) {
        const targetRequestors = target.emissions[emission._id] = target.emissions[emission._id] || {};
        targetRequestors[requestor] = {
          pass: !!emission.pass,
          date: emission.date,
          order: emission.contact.reported_date || -1,
        };
        isUpdated = true;
      }
    }

    return isUpdated;
  },

  aggregateStoredTargetEmissions: (state, targetEmissionFilter) => {
    const minifyTarget = target => {
      const pick = (obj, attrs) => attrs
        .reduce((agg, attr) => {
          if (Object.hasOwnProperty.call(obj, attr)) {
            agg[attr] = obj[attr];
          }
          return agg;
        }, {});

      const minified = pick(target, ['id', 'type', 'goal', 'translation_key', 'icon', 'subtitle_translation_key']);

      const emissionIds = Object.keys(target.emissions);
      const countEmissionClusterWith = emissionClusterFilter => emissionIds
        .map(emissionId => {
          const clusterIds = Object.keys(target.emissions[emissionId]);
          const filteredInstanceIds = clusterIds.filter(clusterId => !targetEmissionFilter || targetEmissionFilter(target.emissions[emissionId][clusterId]));
          return pick(target.emissions[emissionId], filteredInstanceIds);
        })
        .filter(emission => emissionClusterFilter(emission))
        .length;

      minified.value = {
        pass: countEmissionClusterWith(isPassing),
        total: countEmissionClusterWith(emission => Object.keys(emission).length > 0),
      };

      if (minified.type === 'percent') {
        minified.value.percent = minified.value.total ? Math.round(minified.value.pass * 100 / minified.value.total) : 0;
      }

      return minified;
    };

    const isPassing = emission => {
      let currentOrder = -8640000000000000; // minimum date
      return Object.keys(emission).reduce((agg, contactId) => {
        const contactEmission = emission[contactId];
        if (contactEmission.order > currentOrder) {
          currentOrder = contactEmission.order;
          return contactEmission.pass;
        }

        return agg;
      }, false);
    };

    return Object.keys(state).reduce((agg, targetId) => [...agg, minifyTarget(state[targetId])], []);
  },
};
