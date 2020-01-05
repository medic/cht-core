const contactTypesUtils = require('@medic/contact-types-utils');

angular.module('inboxServices').service('ContactTypes', function(
  Settings
) {
  'use strict';
  'ngInject';

  return {

    HARDCODED_TYPES: contactTypesUtils.HARDCODED_TYPES,

    /**
     * Returns a Promise to resolve the configured contact type identified by the given id.
     */
    get: id => Settings().then(config => contactTypesUtils.getTypeById(config, id)),

    /**
     * Returns a Promise to resolve an array of configured contact types.
     */
    getAll: () => Settings().then(config => contactTypesUtils.getContactTypes(config)),

    /**
     * Returns true if the given type is one of the contact types that
     * were hardcoded in old versions.
     */
    isHardcodedType: contactTypesUtils.isHardcodedType,

    /**
     * Returns true if the given doc is a contact type.
     */
    includes: doc => {
      const type = doc && doc.type;
      if (!type) {
        return false;
      }
      return type === 'contact' ||   // configurable hierarchy
             contactTypesUtils.isHardcodedType(type);  // hardcoded
    },

    /**
     * Returns a Promise to resolve an array of child type names for the
     * given type id. If parent is falsey, returns the types with no parent.
     */
    getChildren: parent => Settings().then(config => contactTypesUtils.getChildren(config, parent)),

    /**
     * Returns a Promise to resolve all the configured place contact types
     */
    getPlaceTypes: () => Settings().then(config => contactTypesUtils.getPlaceTypes(config)),

    /**
     * Returns a Promise to resolve all the configured person contact types
     */
    getPersonTypes: () => Settings().then(config => contactTypesUtils.getPersonTypes(config)),
  };
});
