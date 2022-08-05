const Factory = require('rosie').Factory;
const Faker = require('@faker-js/faker');
const prefix = 'scal-';

const bracUser = () => {
  return new Factory()
    .attr('username', '')
    .attr('roles', '')
    .attr('place', '')
    .attr('contact', '')
    .attr('password', 'Secret_1');
};

const generateUsername = (name) => {
  const username = prefix + (name || Faker.faker.internet.userName());
  return username
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-');
};

const generateBracUser = (name, roles, facility, contact) => {
  return bracUser().build({
    username: generateUsername(name),
    roles: roles,
    place: facility._id,
    contact: contact._id
  });
};

module.exports = {
  generateBracUser,
  bracUser
};
