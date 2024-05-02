const checks = require('./checks');

const RETRY_DELAY = 1000; // one second

const checkEnvironment = (couchUrl) => {
  checks.checkNodeVersion();
  checks.checkServerUrl(couchUrl);
};

const logRequestError = (error) => {
  delete error.options;
  delete error.request;
  delete error.response;
  // eslint-disable-next-line no-console
  console.error(error);
};

const getServerUrl = couchUrl => {
  const serverUrl = new URL(couchUrl);
  serverUrl.pathname = '/';
  return serverUrl.toString();
};

const checkCouchDb = async (serverUrl) => {
  do {
    try {
      await checks.checkCouchDbVersion(serverUrl);
      await checks.checkCouchDbNoAdminPartyMode(serverUrl);
      await checks.checkCouchDbCluster(serverUrl);
      await checks.checkCouchDbSystemDbs(serverUrl);
      return; // check was successful
    } catch (err) {
      logRequestError(err);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
    // eslint-disable-next-line no-constant-condition
  } while (true);
};

const check = async (couchUrl) => {
  try {
    checkEnvironment(couchUrl);
    await checkCouchDb(getServerUrl(couchUrl));
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  }
};

module.exports = {
  check
};
