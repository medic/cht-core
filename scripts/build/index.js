const packageJson = require('../../package.json');
const path = require('path');
const fs = require('fs');
const rpn = require('request-promise-native');

const {
  TAG,
  COUCH_URL,
  BRANCH,
  BUILD_NUMBER,
  API_PORT,
  ECR_REPO,
} = process.env;
const DEFAULT_API_PORT = 5988;

const buildPath = path.resolve(__dirname, '..', '..', 'build');
const stagingPath = path.resolve(buildPath, 'staging');
const ddocsBuildPath = path.resolve(buildPath, 'ddocs');

const getCouchConfig = () => {
  if (!COUCH_URL) {
    throw 'Required environment variable COUCH_URL is undefined. (eg. http://your:pass@localhost:5984/medic)';
  }
  const parsedUrl = new URL(COUCH_URL);
  if (!parsedUrl.username || !parsedUrl.password) {
    throw 'COUCH_URL must contain admin authentication information';
  }

  return {
    username: parsedUrl.username,
    password: parsedUrl.password,
    dbName: parsedUrl.pathname.substring(1),
    withPath: path => `${parsedUrl.protocol}//${parsedUrl.username}:${parsedUrl.password}@${parsedUrl.host}/${path}`,
    withPathNoAuth: path => `${parsedUrl.protocol}//${parsedUrl.host}/${path}`,
  };
};

const getApiUrl = (pathname = '') => {
  const apiUrl = new URL(COUCH_URL);
  apiUrl.port = API_PORT || DEFAULT_API_PORT;
  apiUrl.pathname = pathname;

  return apiUrl.toString();
};

const releaseName = TAG || BRANCH || 'local-development';
const buildTime = new Date().getTime();

const getVersion = () => {
  if (TAG) {
    return TAG;
  }
  if (BRANCH === 'master') {
    return `${packageJson.version}-alpha.${BUILD_NUMBER}`;
  }
  if (BRANCH) {
    return `${packageJson.version}-${BRANCH}.${BUILD_NUMBER}`;
  }

  if (process.env.VERSION) {
    return process.env.VERSION;
  }

  return `${packageJson.version}-dev.${buildTime}`;
};

const getImageTag = (service) => {
  const version = getVersion();
  const tag = version.replace(/\//g, '-');
  const repo = ECR_REPO || 'medicmobile';
  return service ? `${repo}/cht-${service}:${tag}` : tag;
};

const setBuildInfo = () => {
  const buildInfoPath = path.resolve(ddocsBuildPath, 'medic-db', 'medic', 'build_info');
  mkdirSync(buildInfoPath);
  // the validate_doc_update from staging.dev requires all of these fields
  fs.writeFileSync(path.resolve(buildInfoPath, 'version'), releaseName);
  fs.writeFileSync(path.resolve(buildInfoPath, 'base_version'), packageJson.version);
  fs.writeFileSync(path.resolve(buildInfoPath, 'time'), new Date().toISOString());
  fs.writeFileSync(path.resolve(buildInfoPath, 'author'), `grunt on ${process.env.USER}`);

  const buildVersionPath = path.resolve(ddocsBuildPath, 'medic-db', 'medic', 'version');
  fs.copyFileSync(buildVersionPath, path.resolve(buildInfoPath, 'build'));
};

const mkdirSync = (dirPath) => {
  if (!fs.existsSync(dirPath)){
    fs.mkdirSync(dirPath);
  }
};

const createStagingDoc = () => {
  mkdirSync(stagingPath);

  fs.writeFileSync(path.resolve(stagingPath, '_id'), `medic:medic:test-${BUILD_NUMBER}`);
  mkdirSync(path.resolve(stagingPath, '_attachments'));
};

const populateStagingDoc = () => {
  const ddocAttachmentsPath = path.resolve(stagingPath, '_attachments', 'ddocs');
  mkdirSync(ddocAttachmentsPath);

  fs.readdirSync(ddocsBuildPath, { withFileTypes: true }).forEach(file => {
    if (!file.isDirectory()) {
      fs.copyFileSync(path.resolve(ddocsBuildPath, file.name), path.resolve(ddocAttachmentsPath, file.name));
    }
  });

  // the validate_doc_update from staging.dev requires full build info in the staging document.
  copyBuildInfoToStagingDoc();
};

const copyBuildInfoToStagingDoc = () => {
  const medicBuildInfoPath = path.resolve(ddocsBuildPath, 'medic-db', 'medic', 'build_info');
  const stagingBuildInfoPath = path.resolve(stagingPath, 'build_info');
  mkdirSync(stagingBuildInfoPath);

  fs.readdirSync(medicBuildInfoPath, { withFileTypes: true }).forEach(file => {
    if (!file.isDirectory()) {
      fs.copyFileSync(path.resolve(medicBuildInfoPath, file.name), path.resolve(stagingBuildInfoPath, file.name));
    }
  });
};

const updateServiceWorker = () => {
  const updateSWUrl = getApiUrl('/api/v2/upgrade/service-worker');

  return rpn.get(updateSWUrl).catch(err => {
    if (err.status === 401) {
      throw new Error('Environment variable COUCH_URL has invalid authentication');
    }
    if (err.status === 403) {
      throw new Error('Environment variable COUCH_URL must have admin authentication');
    }

    if (err.error && err.error.code === 'ECONNREFUSED') {
      console.warn('API could not be reached, so the service-worker has not been updated. ');
      return;
    }

    throw err;
  });
};

const setDdocsVersion = () => {
  const version = getVersion();
  const databases = fs.readdirSync(ddocsBuildPath);
  databases.forEach(database => {
    const dbPath = path.resolve(ddocsBuildPath, database);
    if (!fs.lstatSync(dbPath).isDirectory()) {
      return;
    }
    const ddocs = fs.readdirSync(dbPath);
    ddocs.forEach(ddoc => {
      fs.writeFileSync(path.resolve(dbPath, ddoc, 'version'), version);
    });
  });
};


module.exports = {
  setDdocsVersion,
  getCouchConfig,
  setBuildInfo,
  createStagingDoc,
  populateStagingDoc,
  updateServiceWorker,
  getImageTag,
  getVersion,
};
