const db = require('../db');
const environment = require('../environment');
const ddocs = require('./setup/ddocs');
const logger = require('../logger');

let deployInfoCache;

const getDeployInfo = async () => {
  if (deployInfoCache) {
    return deployInfoCache;
  }

  try {
    const ddoc = await db.medic.get(ddocs.getId(environment.ddoc));
    deployInfoCache = { version: ddoc.version, ...ddoc.build_info, ...ddoc.deploy_info };

    return deployInfoCache;
  } catch (err) {
    logger.error('Error while getting deploy info: %o', err);
    throw err;
  }
};

module.exports = {
  get: getDeployInfo,
};
