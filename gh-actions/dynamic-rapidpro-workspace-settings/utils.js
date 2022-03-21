// do it in a separate repo
const path = require('path');
const { render } = require('template-file');
const axios = require('axios').default;
const util = require('util')

const fields = ['hostname', 'couch_node_name', 'couch_username', 'couch_password', 'rp_hostname', 'value_key', 'rp_contact_group', 'write_patient_state_flow', 'rp_api_token', 'rp_flows', 'directory']

const getReplacedContent = async (content, data) => await render(JSON.stringify(content), data);

const getCouchDbUrl = (hostname, couch_node_name, value_key, couch_username, couch_password) => {
  try{
    const url = new URL(`${hostname}/_node/${couch_node_name}/_config/medic-credentials/${value_key}`);
    url.username = couch_username;
    url.password = couch_password;
    
    return url;
  } catch(err){
    throw new Error(err.message);
  }
};

// return await axios with the parameters
const setMedicCredentials = async (url, rp_api_token) => {
  return await axios({
    method: 'put',
    url: url.href,
    data: `"${rp_api_token}"`
  });
};

const getInputs = (core) => {
  const inputs = {};
  fields.forEach((field) => {
    inputs[field] = core.getInput(field);
  });
  return inputs;
};

const getFormattedFlows = flows => `module.exports = ${util.inspect(JSON.parse(flows))};\n`;

const run = async (githubWorkspacePath, core, fs, settingsFile, flowsFile) => {
  try {
    if (!githubWorkspacePath) {
      throw new Error('GITHUB_WORKSPACE not defined');
    }
    const secrets = getInputs(core);
    const codeRepository = path.resolve(path.resolve(githubWorkspacePath), secrets.directory);
    process.chdir(codeRepository);
    const url = getCouchDbUrl(secrets.hostname, secrets.couch_node_name, secrets.value_key, secrets.couch_username, secrets.couch_password);
    
    const settings = await getReplacedContent(settingsFile, secrets);
    const flows = await getReplacedContent(flowsFile, secrets.rp_flows);

    await setMedicCredentials(url, secrets.rp_api_token);
    fs.writeFileSync(`${codeRepository}/${settingsFile}`, settings);
    fs.writeFileSync(`${codeRepository}/${flowsFile}`, getFormattedFlows(flows));
    core.info('Success');
    return true;
  } catch (error) {
    core.setFailed(error.message);
    return false;
  }
};

module.exports = {
  fields,
  getReplacedContent,
  getCouchDbUrl,
  setMedicCredentials,
  getInputs,
  getFormattedFlows,
  run
};
