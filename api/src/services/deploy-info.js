const environment = require('@medic/environment');
const fs = require('fs');
const path = require('path');
const resources = require('../resources');

const webappPath = resources.webappPath;
const DEPLOY_INFO_OUTPUT_PATH = path.join(webappPath, 'deploy-info.json');

const getDeployInfo = () => environment.getDeployInfo();

const store = async () => {
  const deployInfo = await getDeployInfo();
  return await fs.promises.writeFile(DEPLOY_INFO_OUTPUT_PATH, JSON.stringify(deployInfo));
};

module.exports = {
  get: getDeployInfo,
  store,
};
