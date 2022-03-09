const rewire = require('rewire');
const { expect } = require('chai');
const process = require('process');
const cp = require('child_process');
const path = require('path');
const secrets = require('./env');

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
  });

  beforeEach(() => {
    // set up the environment variables
    process.env['GITHUB_WORKSPACE'] = path.join(__dirname, '../');
    app = rewire('../index.js');
    search = app.__get__('search');
    settings = require('./app_settings.json');
    flowsFileName = `${process.env['GITHUB_WORKSPACE']}/flows.js`;
  });
  
  afterEach(() => { 
      // check there are no errors and clear the environmental variables
  });

  it('test search()', async () => {
    const url = search(settings, 'base_url');
    expect(url).to.contain('http');
  });

  it('test regex()', async () => {
    const regex = app.__get__('regex');
    const regexed = regex(search(settings, 'base_url'));
    expect(regexed.toString().endsWith('g'));
  });

  it('test writeFlowsFile()', async () => {
    const writeFlowsFile = app.__get__('writeFlowsFile');
    writeFlowsFile(flowsFileName, secrets.flows);
  });

  /*it('test setMedicCredentials()', async () => {
    expect(!!'true').to.be.true;
  });*/
});
