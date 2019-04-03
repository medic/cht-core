angular.module('inboxServices').service('ContactTypes', function(
  Settings
) {
  'use strict';
  'ngInject';

  const HARDCODED_TYPES = [
    'district_hospital',
    'health_center',
    'clinic',
    'person'
  ];

  const getConfig = () => Settings().then(config => config.contact_types || []);

  return {

    /**
     * Returns a Promise to resolve the configured contact type identified by the given id.
     */
    get: id => getConfig().then(types => types.find(type => type.id === id)),

    /**
     * Returns a Promise to resolve an array of configured contact types.
     */
    getAll: getConfig,

    /**
     * Returns true is the given doc is a contact type.
     */
    includes: doc => {
      return doc.type === 'contact' ||           // configurable hierarchy
             HARDCODED_TYPES.includes(doc.type); // hardcoded hierarchy
    },

    /**
     * Returns a Promise to resolve an array of child type names for the
     * given type. If type is falsey, returns the types with no parent.
     */
    getChildren: parent => {
      return getConfig().then(types => {
        return types.filter(type => {
          const parents = type.parents || [];
          return (!parent && !parents.length) || parents.includes(parent);
        });
      });
    }
  };
});
