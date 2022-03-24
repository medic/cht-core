
const { Factory } = require('rosie');
const { faker } = require('@faker-js/faker');
Factory.define('secrets').attrs({
  hostname: faker.internet.url(),
  couch_node_name: 'couchdb@127.0.0.1',
  couch_username: faker.internet.userName(),
  couch_password: faker.internet.password(),
  rp_hostname: faker.internet.url(),
  rp_api_token: faker.datatype.uuid(),
  value_key: 'rapidpro.dev',
  rp_contact_group: faker.datatype.uuid(),
  write_patient_state_flow: faker.datatype.uuid(),
  directory: 'test',
  app_settings_file: 'app_settings.json',
  flows_file: 'flows.js',
  rp_flows: {
    sample_flow_1_uuid: faker.datatype.uuid(),
    sample_flow_2_uuid: faker.datatype.uuid()
  }
});

const secrets = Factory.build(`secrets`);
secrets.getInput = key => secrets[key];

module.exports = secrets;
