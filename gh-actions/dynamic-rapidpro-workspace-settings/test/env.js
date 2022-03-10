
const { Factory } = require('rosie');
const { faker } = require('@faker-js/faker');
Factory.define('secrets').attrs({
  hostname: faker.internet.domainName(),
  couch_node_name: faker.internet.domainName(),
  couch_username: faker.internet.userName(),
  couch_password: faker.internet.password(),
  rp_hostname: faker.internet.domainName(),
  rp_api_token: faker.datatype.uuid(),
  value_key: faker.datatype.uuid(),
  rp_contact_group: faker.datatype.uuid(),
  flows: {
    sample_flow_1_uuid: faker.datatype.uuid(),
    sample_flow_2_uuid: faker.datatype.uuid()
  }
});

const secrets = Factory.build('secrets');

module.exports = secrets;
