/*
 * DEPRECATED: Roles are now configurable so this hardcoded map won't
 * necessarily work. It is kept for backwards compatibility only.
 *
 * Specifically:
 *  - getRoles converts a supposed "type" in a collection of roles (that includes itself)
 *  - By convention, the type is always the first role
 *  - Thus, you can get the original type (in theory) back out by getting the first role
 */
const rolesMap = {
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
    return [type].concat(rolesMap[type]);
  }
  return [type];
};

