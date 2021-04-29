const Factory = require('rosie').Factory;

const place = {
  _id: 'hc1',
  type: 'health_center',
  name: 'Health Center 1',
  parent: 'dist1'
};

const contact = {
  _id: 'fixture:user:user1',
  name: 'OfflineUser'
};

Factory.define('offlineUser')
  .attr('username', 'user1')
  .attr('password', 'Secret_1')
  .attr('contact', contact)
  .attr('place', place)
  .attr('roles', ['chw']);
