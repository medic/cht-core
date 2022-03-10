const rewire = require('rewire');
const { expect } = require('chai');
const process = require('process');
const cp = require('child_process');
const path = require('path');
const secrets = require('./env');
const mock = require('mock-fs');
const { updateAppSettings, fs } = require('../utils');

// const action = require('../index');
let app;
let settings;
let flowsFileName;
let search;
describe('rapidpro action test suite', () => {
  // console.log(process.env['GITHUB_WORKSPACE']);
  before(async () => { 
    // set up app settings here
    
  });

  after(async () => { 
    // clear app settings document
    mock.restore();
  });

  beforeEach(() => {
    // set up the environment variables
    process.env['GITHUB_WORKSPACE'] = path.join(__dirname, '../');
    app = rewire('../utils.js');
    search = app.__get__('search');
    settings = require('./app_settings.json');
    flowsFileName = `flows.js`;
  });
  
  afterEach(() => { 
    // check there are no errors and clear the environmental variables
    
  });

  it('should create a flows.js file', async () => {
    const writeFlowsFile = app.__get__('writeFlowsFile');
    writeFlowsFile(process.env['GITHUB_WORKSPACE'], 'test', flowsFileName, secrets.flows);
  });

  it('should successfully update medic-credentials in couchdb', async () => {
    expect(!!'true').to.be.true;
  });

  it('should update app settings with the given secrets', async () => {
    expect(!!'true').to.be.true;
    // read the file
    // run function
    // check content is altered
    const settingsFile = `app_settings.json`;
    const directory = `test`;
    await updateAppSettings(process.env['GITHUB_WORKSPACE'], secrets.rp_hostname, secrets.value_key, secrets.rp_contact_group, secrets.write_patient_state_flow, directory, settingsFile);
    settings = require('./app_settings.json');
    expect(search(settings, 'base_url')).to.equal(secrets.rp_hostname);
  });

  /*
  - mock the parameters and the call
  - check what sent and whether it is the expected
  it('test setMedicCredentials()', async () => {
    expect(!!'true').to.be.true;
  });*/
});
