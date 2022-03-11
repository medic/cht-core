const rewire = require('rewire');
const { expect } = require('chai');
const process = require('process');
const path = require('path');
const sinon = require('sinon');
const utils = rewire('../utils');
const secrets = require('./env');
const settings = require('./app_settings.json');
const flows = require('./flows');

describe('rapidpro action test suite', () => {
  const mockedAxiosResponse = {
    data: {},
    status: 200,
    statusText: 'OK'
  };
  beforeEach(() => {
    sinon.stub(process, 'env');
    process.env['GITHUB_WORKSPACE'] = path.join(__dirname, '../');
    sinon.stub(utils, 'setMedicCredentials').returns(mockedAxiosResponse);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('method getCouchDbUrl should return a formatted url and setMedicCredentials should put it in CouchDB', async () => {
    // check the expected url is set
    const url = utils.getCouchDbUrl(secrets.hostname, secrets.couch_node_name, secrets.value_key, secrets.couch_username, secrets.couch_password);
    expect(url.hostname).to.be.equal(secrets.hostname);
    expect(url.username).to.be.equal(secrets.couch_username);
    expect(url.password).to.be.equal(secrets.couch_password);

    // set the medic credentials in couchDB
    const response = await utils.setMedicCredentials(url, secrets.rp_api_token);
    expect(response.status).to.be.equal(200);
    expect(response.data).to.be.deep.equal({});
  });

  it('method getInputs should return an object containing required secrets', async () => {
    const inputs = utils.getInputs(secrets);
    expect(inputs.rp_contact_group).to.equal(secrets.rp_contact_group);
  });

  it('method getReplacedContent should update app settings with the given secrets', async () => {
    // check updated outbound modules
    const appSettings = await utils.getReplacedContent(settings, secrets);
    expect(search(JSON.parse(appSettings), 'base_url')).to.equal(secrets.rp_hostname);

    // check updated flows.js
    const rapidproFlows = await utils.getReplacedContent(flows, secrets.rp_flows);
    expect(search(JSON.parse(rapidproFlows), 'sample_flow_2_uuid')).to.equal(secrets.rp_flows.sample_flow_2_uuid);
  });
});

/**
 * Finds a value from nested JavaScript object using a key.
 * @param {object} haystack the JavaScript object
 * @param {string}  needle the key to search
 */
const search = (haystack, needle) =>
  needle in haystack
    ? haystack[needle]
    : Object.values(haystack).reduce((acc, val) => {
      if (acc !== undefined) return acc;
      if (typeof val === 'object') return search(val, needle);
    }, undefined);
