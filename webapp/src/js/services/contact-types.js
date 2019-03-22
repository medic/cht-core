angular.module('inboxServices').service('ContactTypes', function(
  Settings
) {
  'use strict';
  'ngInject';

  const getConfig = () => Settings().then(config => config.contact_types || []);

  return {

    get: id => {
      return getConfig().then(types => types.find(type => type.id === id));
    },

    /**
     * Returns an array of child type names for the given type. If type is
     * falsey, returns the types with no parent.
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
