/*
 * TODO: formalise this relationship in a shared library
 *
 * Specifically:
 *  - getRoles converts a supposed "type" in a collection of roles (that includes itself)
 *  - By convention, the type is always the first role
 *  - Thus, you can get the original type (in theory) back out by getting the first role
 *
 *  This may need to change once we makes roles more flexible, if the end result is that
 *  types are initial collections of roles but users can gain or lose any role manually.
 *
 *  NB: these are also documented in /api/README.md
 *
 *  Related to: https://github.com/medic/medic-webapp/issues/2583
 */
var rolesMap = {
  'national-manager': ['kujua_user', 'data_entry', 'national_admin'],
  'district-manager': ['kujua_user', 'data_entry', 'district_admin'],
  'facility-manager': ['kujua_user', 'data_entry'],
  'data-entry': ['data_entry'],
  'analytics': ['kujua_analytics'],
  'gateway': ['kujua_gateway']
};

module.exports = function(type) {
  // create a new array with the type first, by convention
  if (!type) {
    return [];
  }
  if (type in rolesMap) {
    return [type].concat(rolesMap[type])
  }
  return [type];
};

