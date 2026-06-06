const { USER_ROLES: { COUCHDB_ADMIN } } = require('@medic/constants');
const Factory = require('rosie').Factory;
const { PREFIXES } = require('@medic/constants');

module.exports = new Factory()
  .attr('_id', PREFIXES.COUCH_USER + 'admin')
  .attr('id', PREFIXES.COUCH_USER + 'admin')
  .attr('name', 'admin')
  .attr('type', 'user-settings')
  .attr('contact_id', 'e2e_contact_test_id')
  .attr('language', 'en')
  .attr('known', true)
  .attr('roles', [COUCHDB_ADMIN]);


