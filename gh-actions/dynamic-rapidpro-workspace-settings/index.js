const core = require('@actions/core');
const {getCouchDbUrl, setMedicCredentials, writeFlowsFile, updateAppSettings} = require('./utils');

const githubWorkspacePath = process.env['GITHUB_WORKSPACE'];
const couch_username = core.getInput('couch_username');
const couch_password = core.getInput('couch_password');
const hostname = core.getInput('hostname');
const couch_node_name = core.getInput('couch_node_name'); 
const rp_hostname = core.getInput('rp_hostname');
const value_key = core.getInput('value_key');
const rp_contact_group = core.getInput('rp_contact_group');
const write_patient_state_flow = core.getInput('write_patient_state_flow');  
const rp_api_token = core.getInput('rp_api_token');
const rp_flows = core.getInput('rp_flows');
const directory = core.getInput('directory');
const settingsFile = `app_settings.json`;
const flowsFile = `flows.js`;

setMedicCredentials(getCouchDbUrl(hostname, couch_node_name, value_key, couch_username, couch_password), rp_api_token);
writeFlowsFile(githubWorkspacePath, directory, flowsFile, rp_flows);
updateAppSettings(githubWorkspacePath, rp_hostname, value_key, rp_contact_group, write_patient_state_flow, rp_api_token, rp_flows, directory, settingsFile);
