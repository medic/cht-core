const _ = require('lodash');

const userFactory = require('./tests/factories/cht/users/users');
const placeFactory = require('./tests/factories/cht/contacts/place');
const personFactory = require('./tests/factories/cht/contacts/person');

/* global window */

//describe('Muting', () => {
  const places = placeFactory.generateHierarchy();
  const district = places.get('district_hospital');
  const healthCenter = places.get('health_center');
  const clinic = places.get('clinic');
  const clinic0 = Object.assign({}, clinic, { name: 'clinic_2', _id: 'another_clinic' });
  const onlineUser = userFactory.build({ place: healthCenter._id, roles: [ 'program_officer' ] });
  const offlineUser = userFactory.build({ place: healthCenter._id, roles: [ 'chw' ] });
  const patient1 = personFactory.build({ name: 'patient1', parent: { _id: healthCenter._id, parent: healthCenter.parent } });
  const patient2 = personFactory.build({ name: 'patient2', parent: { _id: healthCenter._id, parent: healthCenter.parent } });
  const patient3 = personFactory.build({ name: 'patient3', parent: { _id: healthCenter._id, parent: healthCenter.parent } });


  
console.log('clini..', clinic);
console.log('clinig0...', clinic0);