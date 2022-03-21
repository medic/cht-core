const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const utils = require('../utils');
const secrets = require('./env');
const settings = require('./app_settings.json');
const flows = require('./flows');
const fs = require('fs');
let sandbox = sinon.createSandbox();

describe('rapidpro action test suite', () => {
  const mockedAxiosResponse = {
    data: {},
    status: 200,
    statusText: 'OK'
  };
  beforeEach(() => {
    sandbox.stub(process, 'env').value({ 'GITHUB_WORKSPACE': path.join(__dirname, '../') });
    sandbox.stub(utils, 'setMedicCredentials').resolves(mockedAxiosResponse);
    sandbox.stub(fs, 'writeFileSync').returns({});
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('method getCouchDbUrl should return a formatted url and setMedicCredentials should put it in CouchDB', async () => {
    // check the expected url is set
    const url = utils.getCouchDbUrl(secrets.hostname, secrets.couch_node_name, secrets.value_key, secrets.couch_username, secrets.couch_password);
    expect(url.origin).to.be.equal(secrets.hostname);
    expect(url.username).to.be.equal(secrets.couch_username);
    expect(url.password).to.be.equal(secrets.couch_password);

    // set the medic credentials in couchDB
    const response = await utils.setMedicCredentials(url, secrets.rp_api_token);
    expect(response.status).to.be.equal(200);
    expect(response.data).to.be.deep.equal({});
  });

  it('method getCouchDbUrl should throw an error if an invalid url is given', async () => {
    try{
      utils.getCouchDbUrl('some_invalid_url', secrets.couch_node_name, secrets.value_key, secrets.couch_username, secrets.couch_password);
    }catch(err){
      expect(err.message).to.include('Invalid URL');
    }
  });

  it('method getInputs should return an object containing required secrets', async () => {
    const inputs = utils.getInputs(secrets);
    utils.fields.forEach(field => {
      expect(inputs[field]).to.equal(secrets[field]);
    });
  });

  it('method getInputs should fail if no argument is passed', async () => {
    try{
      utils.getInputs();
    }catch(err){
      expect(err.message).to.include('Cannot read property');
    }
  });

  it('method getReplacedContent should update app settings with the given secrets', async () => {
    // check updated outbound modules - check all values
    const appSettings = await utils.getReplacedContent(settings, secrets);
    const parsedSettings = JSON.parse(appSettings);
    expect(search(parsedSettings, 'base_url')).to.equal(secrets.rp_hostname);

    // check updated flows.js
    const rapidproFlows = await utils.getReplacedContent(flows, secrets.rp_flows);
    const parsedFlows = JSON.parse(rapidproFlows);
    for (const elem in parsedFlows) {
      expect(parsedFlows[elem]).to.equal(secrets.rp_flows[elem]);
    }
  });

  it('integration test using the run method should complete successfully', async () => {
    const result = await utils.run(process.env.GITHUB_WORKSPACE, secrets, fs, settings, flows);
    expect(result).to.be.true;
  });

  it('integration test should fail if github workspace is not defined', async () => {
    const result = await utils.run(null, secrets, fs, settings, flows);
    expect(result).to.be.false;
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
