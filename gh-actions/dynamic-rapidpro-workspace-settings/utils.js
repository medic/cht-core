const core = require('@actions/core');
const path = require('path');
const { render } = require('template-file');
const axios = require('axios').default;
const util = require('util')

const fields = ['hostname', 'couch_node_name', 'couch_username', 'couch_password', 'rp_hostname', 'value_key', 'rp_contact_group', 'write_patient_state_flow', 'rp_api_token', 'rp_flows', 'directory']

const getReplacedContent = async (content, data) =>{
  try{
    if(!data || !content){
      throw new Error('Data file or content to replace not defined');
    }
    return await render(JSON.stringify(content), data);
  }catch(err){
    throw new Error(err.message);
  }
}; 

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

const getInputs = (core) => {
  const inputs = {};
  fields.forEach((field) => {
    inputs[field] = core.getInput(field);
  });
  return inputs;
};

const getFormattedFlows = flows => `module.exports = ${util.inspect(JSON.parse(flows))};\n`;

const run = async (githubWorkspacePath, params, fs, settingsFile, flowsFile) => {
  try {
    if (!githubWorkspacePath) {
      throw new Error('GITHUB_WORKSPACE not defined');
    }    
    const secrets = getInputs(params);
    const codeRepository = path.resolve(path.resolve(githubWorkspacePath), secrets.directory);
    process.chdir(codeRepository);
    const url = getCouchDbUrl(secrets.hostname, secrets.couch_node_name, secrets.value_key, secrets.couch_username, secrets.couch_password);
    const appSettings = fs.readFileSync(`${codeRepository}/${settingsFile}`, 'utf8');
    const flowsData = fs.readFileSync(`${codeRepository}/${flowsFile}`, 'utf8');
    const settings = await getReplacedContent(appSettings, secrets);
    const flows = await getReplacedContent(flowsData, secrets.rp_flows);
    console.log(flowsData);
    
    await axios.put(url.href, {data: `"${secrets.rp_api_token}"`});
    fs.writeFileSync(`${codeRepository}/${settingsFile}`, settings);
    fs.writeFileSync(`${codeRepository}/${flowsFile}`, getFormattedFlows(flows));
    core.info('Successful');
    return true;
  } catch (error) {
    core.setFailed(error.message);
  }
};

module.exports = {
  fields,
  getReplacedContent,
  getCouchDbUrl,
  getInputs,
  getFormattedFlows,
  run
};
