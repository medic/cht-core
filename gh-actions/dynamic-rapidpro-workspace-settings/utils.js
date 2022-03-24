const core = require('@actions/core');
const path = require('path');
const { render } = require('template-file');
const axios = require('axios').default;
const util = require('util')

const fields = ['hostname', 'couch_node_name', 'couch_username', 'couch_password', 'rp_hostname', 'value_key', 'rp_contact_group', 'write_patient_state_flow', 'rp_api_token', 'rp_flows', 'directory', 'app_settings_file', 'flows_file']

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

const getFormattedFlows = flows => `module.exports = ${util.inspect(flows)};\n`;

const run = async (githubWorkspacePath, params, fs) => {
  try {
    if (!githubWorkspacePath) {
      throw new Error('GITHUB_WORKSPACE not defined');
    }    
    const secrets = getInputs(params);
    const codeRepository = path.resolve(path.resolve(githubWorkspacePath), secrets.directory);
    process.chdir(codeRepository);
    const url = getCouchDbUrl(secrets.hostname, secrets.couch_node_name, secrets.value_key, secrets.couch_username, secrets.couch_password);
    const appSettings = fs.readFileSync(`${codeRepository}/${secrets.app_settings_file}`, 'utf8');
    const settings = await getReplacedContent(JSON.parse(appSettings), secrets);

    await axios.put(url.href, `"${secrets.rp_api_token}"`);    
    fs.writeFileSync(`${codeRepository}/${secrets.app_settings_file}`, settings);
    fs.writeFileSync(`${codeRepository}/${secrets.flows_file}`, getFormattedFlows(secrets.rp_flows));
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
