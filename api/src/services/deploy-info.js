const db = require('../db');
const environment = require('../environment');
const ddocs = require('./setup/ddocs');
const logger = require('@medic/logger');
const semver = require('semver');

let deployInfoCache;

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

module.exports = {
  get: getDeployInfo,
};
