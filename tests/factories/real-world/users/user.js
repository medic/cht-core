const Factory = require('rosie').Factory;
const uuid = require('uuid');

const user = () => {
  return new Factory()
    .sequence('_id', uuid.v4)
    .attr('name', '')
    .attr('type', 'user')
    .attr('roles', '')
    .attr('facility_id', '')
    .attr('password', 'Secret_1')
    .attr('known', true);
};

const generateUser = (name, roles, facility) => {
  return user().build({
    name: name,
    roles: roles,
    facility_id: facility,
  });
};

module.exports = {
  generateUser,
  user
};
