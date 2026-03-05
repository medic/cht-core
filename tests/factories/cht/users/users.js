const Factory = require('rosie').Factory;
const { CONTACT_TYPES } = require('@medic/constants');
const phoneNumber = '+12068881234';

const place = {
  _id: 'hc1',
  type: CONTACT_TYPES.HEALTH_CENTER,
  name: 'Health Center 1',
  parent: 'dist1'
};

const contact = {
  _id: 'fixture:user:user1',
  name: 'OfflineUser',
  phone: phoneNumber
};


module.exports = new Factory()
  .attr('username', 'user1')
  .attr('password', 'Secret_1')
  .attr('contact', contact)
  .attr('place', place)
  .attr('phone', phoneNumber)
  .attr('roles', ['chw'])
  .attr('known', true);
