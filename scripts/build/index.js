const packageJson = require('../../package.json');
const path = require('path');
const fs = require('fs');

const {
  TAG,
  COUCH_URL,
  BRANCH,
  BUILD_NUMBER,
} = process.env;

const buildPath = path.resolve(__dirname, '..', '..', 'build');
const stagingPath = path.resolve(buildPath, 'staging');

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

const getVersion = () => {
  if (TAG) {
    return TAG;
  }
  let version = packageJson.version;
  if (BRANCH === 'master') {
    version += `-alpha.${BUILD_NUMBER}`;
  }
  return version;
};

const releaseName = TAG || BRANCH || 'local-development';
const setBuildInfo = () => {
  const buildInfoPath = path.resolve(buildPath, 'ddocs', 'medic-db', 'medic', 'build_info');
  mkdirSync(buildInfoPath);
  // the validate_doc_update from staging.dev requires all of these fields
  fs.writeFileSync(path.resolve(buildInfoPath, 'version'), releaseName);
  fs.writeFileSync(path.resolve(buildInfoPath, 'base_version'), packageJson.version);
  fs.writeFileSync(path.resolve(buildInfoPath, 'time'), new Date().toISOString());
  fs.writeFileSync(path.resolve(buildInfoPath, 'author'), `grunt on ${process.env.USER}`);
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

  const buildDdocsPath = path.resolve(buildPath, 'ddocs');
  fs.readdirSync(buildDdocsPath, { withFileTypes: true }).forEach(file => {
    if (!file.isDirectory()) {
      fs.copyFileSync(path.resolve(buildDdocsPath, file.name), path.resolve(ddocAttachmentsPath, file.name));
    }
  });

  // the validate_doc_update from staging.dev requires full build info in the staging document.
  copyBuildInfoToStagingDoc();
};

const copyBuildInfoToStagingDoc = () => {
  const medicBuildInfoPath = path.resolve(buildPath, 'ddocs', 'medic-db', 'medic', 'build_info');
  const stagingBuildInfoPath = path.resolve(stagingPath, 'build_info');
  mkdirSync(stagingBuildInfoPath);

  fs.readdirSync(medicBuildInfoPath, { withFileTypes: true }).forEach(file => {
    if (!file.isDirectory()) {
      fs.copyFileSync(path.resolve(medicBuildInfoPath, file.name), path.resolve(stagingBuildInfoPath, file.name));
    }
  });
};


module.exports = {
  getCouchConfig,
  getVersion,
  setBuildInfo,
  createStagingDoc,
  populateStagingDoc,

};
