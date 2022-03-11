const { render } = require('template-file');
const axios = require('axios').default;
const util = require('util')

const fields = ['hostname', 'couch_node_name', 'couch_username', 'couch_password', 'rp_hostname', 'value_key', 'rp_contact_group', 'write_patient_state_flow', 'rp_api_token', 'rp_flows', 'directory']

const getReplacedContent = async (content, data) => await render(JSON.stringify(content), data);

const getCouchDbUrl = (hostname, couch_node_name, value_key, couch_username, couch_password) => {
  const url = new URL(`https://${hostname}/_node/${couch_node_name}/_config/medic-credentials/${value_key}`);
  url.username = couch_username;
  url.password = couch_password;
  return url;
};

const setMedicCredentials = async (url, rp_api_token) => {
  return axios({
    method: 'put',
    url: url.href,
    data: `"${rp_api_token}"`
  }).then(response => {
    return response
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

module.exports = {
  getReplacedContent,
  getCouchDbUrl,
  setMedicCredentials,
  getInputs,
  getFormattedFlows
};
