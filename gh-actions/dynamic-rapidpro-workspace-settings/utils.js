const github = require('@actions/github');
const replace = require('replace-in-file');
const path = require('path');
const axios = require('axios').default;
const fs = require('fs');
const util = require('util')

const search = (haystack, needle) =>
  needle in haystack
    ? haystack[needle]
    : Object.values(haystack).reduce((acc, val) => {
        if (acc !== undefined) return acc;
        if (typeof val === 'object') return search(val, needle);
      }, undefined);

const regex = expr => new RegExp(expr, 'g');

const setMedicCredentials = (url, rp_api_token) => {
  axios({
    method: 'put',
    url: url,
    data: `"${rp_api_token}"`
  });
};

const writeFlowsFile = (githubWorkspacePath, directory, filename, content) => {
    try {
        const codeRepository = getCodeRepository(githubWorkspacePath, directory);
        const flowsFileName = `${codeRepository}/${filename}`;
        fs.writeFileSync(flowsFileName, `module.exports = ${util.inspect(content)}\n`);
    } catch (err) {
        console.error(err)
    }
};

const getCouchDbUrl = (hostname, couch_node_name, value_key, couch_username, couch_password) => {
  const url = new URL(`https://${hostname}/_node/${couch_node_name}/_config/medic-credentials/${value_key}`);
  url.username = couch_username;
  url.password = couch_password;
  return url;
};

const getCodeRepository = (githubWorkspacePath, directory) => path.resolve(path.resolve(githubWorkspacePath), directory);

const updateAppSettings = async (githubWorkspacePath, rp_hostname, value_key, rp_contact_group, write_patient_state_flow, directory, settingsFile) => {
  try {
    if (!githubWorkspacePath) {
      throw new Error('GITHUB_WORKSPACE not defined');
    }
    const codeRepository = getCodeRepository(githubWorkspacePath, directory);
    process.chdir(codeRepository);
    const appSettings = require(`${codeRepository}/${settingsFile}`);
    const options = {
      files: `${codeRepository}/${settingsFile}`,
      from: [
        regex(search(appSettings, 'base_url')), 
        regex(search(appSettings, 'value_key')), 
        search(appSettings, 'groups').expr, 
        regex(search(appSettings, 'flow').expr)
      ],
      to: [
        rp_hostname, value_key, 
        `['${rp_contact_group}']`, 
        `'${write_patient_state_flow}'`
      ]
    };
    
    replace(options);

    const payload = JSON.stringify(github.context.payload, undefined, 2);
    console.log(`The event payload: ${payload}`);  
  } catch (error) {
    core.setFailed(error.message);
  }
};

module.exports = {
  fs,
  getCouchDbUrl,
  setMedicCredentials,
  writeFlowsFile,
  updateAppSettings
};
