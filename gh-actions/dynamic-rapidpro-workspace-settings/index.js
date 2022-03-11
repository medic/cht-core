const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');
const path = require('path');
const {getReplacedContent, getCouchDbUrl, setMedicCredentials, getInputs, getFormattedFlows} = require('./utils');

const githubWorkspacePath = process.env['GITHUB_WORKSPACE'];

const settingsFile = 'app_settings.json';
const flowsFile = 'flows.js';
const secrets = getInputs(core);

const run = async () => {
  try {
    if (!githubWorkspacePath) {
      throw new Error('GITHUB_WORKSPACE not defined');
    }
    const codeRepository = path.resolve(path.resolve(githubWorkspacePath), secrets.directory);
    process.chdir(codeRepository);
    const url = getCouchDbUrl(secrets.hostname, secrets.couch_node_name, secrets.value_key, secrets.couch_username, secrets.couch_password);
    const settings = getReplacedContent(`${codeRepository}/${settingsFile}`, secrets);
    const flows = getReplacedContent(`${codeRepository}/${settingsFile}`, secrets.rp_flows);
    
    await setMedicCredentials(url, secrets.rp_api_token);
    await fs.writeFileSync(`${codeRepository}/${settingsFile}`, settings);
    await fs.writeFileSync(`${codeRepository}/${flowsFile}`, getFormattedFlows(flows));

    const payload = JSON.stringify(github.context.payload, undefined, 2);
    console.log(`The event payload: ${payload}`);  
  } catch (error) {
    core.setFailed(error.message);
  }
};

run();
