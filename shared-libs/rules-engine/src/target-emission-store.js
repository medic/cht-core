/**
 * @module target-emission-store
 * 
 * 
 */

let state;
let onStateChange;

const self = {
  /**
   * Initializes the target-emission-store from an existing state. If no state is provided, builds an empty state.
   *
   * @param {Object} existingState State object previously passed to the targetEmissionChangeCallback
   * @param {Object} settingsDoc Settings document
   * @param {Object} targetEmissionChangeCallback Callback which is invoked whenever the state changes. Receives the updated state as the only parameter.
   */
  load: (existingState, settingsDoc, targetEmissionChangeCallback) => {
    if (state) {
      throw Error('Attempted to initialize the target-emission-store multiple times.');
    }

    if (!existingState) {
      return self.build(settingsDoc, targetEmissionChangeCallback);
    }

    state = existingState;
    onStateChange = safeCallback(targetEmissionChangeCallback);
  },

  /**
   * Initializes an empty target-emission-store.
   *
   * @param {Object} settingsDoc Settings document
   * @param {Object} targetEmissionChangeCallback Callback which is invoked whenever the state changes. Receives the updated state as the only parameter.
   */
  build: (settingsDoc, targetEmissionChangeCallback) => {
    if (state) {
      throw Error('Attempted to initialize the target-emission-store multiple times.');
    }

    onStateChange = safeCallback(targetEmissionChangeCallback);
    return self.reset(settingsDoc);
  },

  /**
   * Reset to an empty target-emisison-store.
   * 
   * @param {Object} settingsDoc Settings document
   */
  reset: (settingsDoc) => {
    const targetDefinitions = settingsDoc.tasks && settingsDoc.tasks.targets && settingsDoc.tasks.targets.items || [];
    state = targetDefinitions.reduce((agg, definition) => {
      agg[definition.id] = Object.assign({}, definition, { emissions: {} });
      return agg;
    }, {});

    return onStateChange(state);
  },

  /**
   * Store a set of target emissions which were emitted by refreshing a set of contacts
   * 
   * @param {string[]} contactIds An array of contact ids which produced these targetEmissions when refreshed. If undefined,
   * it is equivalent to all contacts being updated
   * @param {Object[]} targetEmissions An array of target emissions (a result of the rules-emitter)
   */
  storeTargetEmissions: (contactIds, targetEmissions) => {
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
        const targetRequestors = target.emissions[emission.id] = target.emissions[emission.id] || {};
        targetRequestors[requestor] = {
          pass: !!emission.pass,
          date: emission.date,
          order: emission.contact.reported_date || -1,
        };
        isUpdated = true;
      }
    }

    if (isUpdated) {
      return onStateChange(state);
    }
  },

  /**
   * Aggregates all stored target emissions into target models
   * 
   * @param {Function(emission)=} targetEmissionFilter
   * 
   * @returns {Object[]} result
   * @returns {string} result[n].* All attributes of the target as defined in the settings doc
   * @returns {Integer} result[n].total The total number of unique target emission ids matching instanceFilter
   * @returns {Integer} result[n].pass The number of unique target emission ids matching instanceFilter with the latest emission with truthy "pass"
   * @returns {Integer} result[n].percent The percentage of pass/total
   */
  getTargets: (targetEmissionFilter) => {
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

      minified.pass = countEmissionClusterWith(isPassing);
      minified.total = countEmissionClusterWith(emission => Object.keys(emission).length > 0);

      if (minified.type === 'percent') {
        minified.percent = minified.total ? Math.round(minified.pass * 100 / minified.total) : 0;
      }

      return minified;
    };

    const isPassing = emission => {
      let currentOrder = -8640000000000000;
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

const safeCallback = callback => (...args) => {
  if (callback && typeof callback === 'function') {
    return callback(...args);
  }
};

// ensure all exported functions are only ever called after initialization
module.exports = Object.keys(self).reduce((agg, key) => {
  agg[key] = (...args) => {
    if (!['build', 'load'].includes(key) && !state) {
      throw Error(`Invalid operation: Attempted to invoke target-emission-store.${key} before call to build or load`);
    }

    return self[key](...args);
  };
  return agg;
}, {});
