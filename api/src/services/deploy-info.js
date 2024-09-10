const db = require('../db');
const environment = require('@medic/environment');
const ddocs = require('./setup/ddocs');
const logger = require('@medic/logger');
const semver = require('semver');
const fs = require('fs');
const path = require('path');
const resources = require('../resources');

let deployInfoCache;
const webappPath = resources.webappPath;
const DEPLOY_INFO_OUTPUT_PATH = path.join(webappPath, 'deploy-info.json');

const getVersion = (ddoc) => {
  return semver.valid(ddoc.build_info?.version) || semver.valid(ddoc.deploy_info?.build) || ddoc.version;
};

const getDeployInfo = async () => {
  if (deployInfoCache) {
    return deployInfoCache;
  }

  try {
    const ddoc = await db.medic.get(ddocs.getId(environment.ddoc));
    deployInfoCache = { ...ddoc.build_info, ...ddoc.deploy_info, version: getVersion(ddoc) };

    return deployInfoCache;
  } catch (err) {
    logger.error('Error while getting deploy info: %o', err);
    throw err;
  }
};

const store = async () => {
  const deployInfo = await getDeployInfo();
  return await fs.promises.writeFile(DEPLOY_INFO_OUTPUT_PATH, JSON.stringify(deployInfo));
};

module.exports = {
  get: getDeployInfo,
  store,
};
