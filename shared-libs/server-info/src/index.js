const semver = require('semver');
const environment = require('@medic/environment');
const request = require('@medic/couch-request');
const logger = require('@medic/logger');

let deployInfoCache;

const getVersionFromDdoc = (ddoc) => {
  return semver.valid(ddoc.build_info?.version) ||
         semver.valid(ddoc.deploy_info?.build) ||
         ddoc.version ||
         'unknown';
};

const getDeployInfo = async (refresh = false) => {
  if (deployInfoCache && !refresh) {
    return deployInfoCache;
  }

  try {
    const ddoc = await request.get({
      url: `${environment.couchUrl}/_design/${environment.ddoc}`,
    });
    deployInfoCache = {
      ...ddoc.build_info,
      ...ddoc.deploy_info,
      version: getVersionFromDdoc(ddoc)
    };
    return deployInfoCache;
  } catch (err) {
    logger.error('Error getting deploy info: %o', err);
    throw err;
  }
};

const getVersion = async () => {
  try {
    const deployInfo = await getDeployInfo();
    return deployInfo.version;
  } catch (err) {
    return 'unknown';
  }
};

module.exports.getDeployInfo = getDeployInfo;
module.exports.getVersion = getVersion;
