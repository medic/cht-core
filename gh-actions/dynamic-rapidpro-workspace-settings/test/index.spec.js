const { expect } = require('chai');
const path = require('path');
const sinon = require('sinon');
const utils = require('../utils');
const secrets = require('./env');
const settings = require('./app_settings.json');
const flows = require('./flows');
const fs = require('fs');
const axios = require('axios').default;

let sandbox = sinon.createSandbox();

describe(`rapidpro action test suite`, () => {
  const mockedAxiosResponse = {
    data: {},
    status: 200,
    statusText: 'OK'
  };
  
  beforeEach(() => {
    sandbox.stub(process, 'env').value({ 'GITHUB_WORKSPACE': path.join(__dirname, '../') });
    // sandbox.stub(fs, 'writeFileSync').returns({});
    sandbox.stub(process, 'stdout');
    sandbox.stub(axios, 'put').resolves(mockedAxiosResponse);
    // sandbox.stub(utils, 'setMedicCredentials').resolves(mockedAxiosResponse);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it(`should get a formatted url to set medic-credentials`, async () => {
    // check the expected url is set
    const url = utils.getCouchDbUrl(secrets.hostname, secrets.couch_node_name, secrets.value_key, secrets.couch_username, secrets.couch_password);
    expect(url.origin).to.be.equal(secrets.hostname);
    expect(url.username).to.be.equal(secrets.couch_username);
    expect(url.password).to.be.equal(secrets.couch_password);
  });

  it(`should fail if an invalid url is given`, async () => {
    expect( function () {
      utils.getCouchDbUrl('some_invalid_url', secrets.couch_node_name, secrets.value_key, secrets.couch_username, secrets.couch_password);
    }).to.throw( Error );
  });

  it(`should return an object containing required secrets`, async () => {
    const inputs = utils.getInputs(secrets);
    utils.fields.forEach(field => {
      expect(inputs[field]).to.equal(secrets[field]);
    });
  });

  it(`should fail if no argument is passed to get required secrets`, async () => {
    expect( function () {
      utils.getInputs();
    }).to.throw( Error );
  });

  it(`should update content using the given data`, async () => {
    // check updated app_settings.json
    const appSettings = await utils.getReplacedContent(settings, secrets);
    const parsedSettings = JSON.parse(appSettings);
    expect(search(parsedSettings, 'base_url')).to.equal(secrets.rp_hostname);
  });

  it(`should fail to update if content or data is not defined`, async () => {
    try {
      await utils.getReplacedContent(settings);
    } catch (err) {
      expect(err).to.include(new Error());
    }
  });

  it(`run method should complete successfully`, async () => {
    const response = await utils.run(process.env.GITHUB_WORKSPACE, secrets, fs, 'app_settings.json', 'flows.js');
    expect(response).to.be.true;
  });

  it(`run should fail if github workspace is not defined`, async () => {
    await utils.run(null, secrets, fs, settings, flows);
    expect(process.exitCode).to.equal(1);
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
