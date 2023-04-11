const Factory = require('rosie').Factory;

module.exports = new Factory()
  .attr('_id', 'org.couchdb.user:admin')
  .attr('id', 'org.couchdb.user:admin')
  .attr('name', 'admin')
  .attr('type', 'user-settings')
  .attr('contact_id', 'e2e_contact_test_id')
  .attr('language', 'en')
  .attr('known', true)
  .attr('roles', ['_admin']);


