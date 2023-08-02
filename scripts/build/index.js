const fs = require('fs');
const spawn = require('child_process').spawn;
const path = require('path');
const rpn = require('request-promise-native');
const mustache = require('mustache');

const packageJson = require('../../package.json');
const versions = require('./versions');

const {
  TAG,
  COUCH_URL,
  BRANCH,
  BUILD_NUMBER,
  API_PORT,
  ECR_PUBLIC_REPO,
} = process.env;
const DEFAULT_API_PORT = 5988;
const MODULES = ['webapp', 'api', 'sentinel', 'admin'];

const buildPath = path.resolve(__dirname, '..', '..', 'build');
const stagingPath = path.resolve(buildPath, 'staging');
const stagingAttachmentsPath = path.resolve(stagingPath, '_attachments');
const localBuildPath = path.resolve(__dirname, '..', '..', 'local-build');
const ddocsBuildPath = path.resolve(buildPath, 'ddocs');

const getApiUrl = (pathname = '') => {
  if (!COUCH_URL) {
    throw new Error('Required environment variable COUCH_URL is undefined. (eg. http://your:pass@localhost:5984/medic)');
  }

  const apiUrl = new URL(COUCH_URL);
  apiUrl.port = API_PORT || DEFAULT_API_PORT;
  apiUrl.pathname = pathname;

  return apiUrl.toString();
};

const releaseName = TAG || BRANCH || `${packageJson.version}-local-development`;

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

  const databases = fs.readdirSync(ddocsBuildPath);
  databases.forEach(database => {
    const dbPath = path.resolve(ddocsBuildPath, database);
    const stat = fs.statSync(dbPath);
    if (!stat.isDirectory()) {
      return;
    }
    const ddocs = fs.readdirSync(dbPath);
    ddocs.forEach(ddoc => {
      copyBuildInfo(path.join(ddocsBuildPath, database, ddoc, 'build_info'));
    });
  });
};

const mkdirSync = (dirPath) => {
  if (!fs.existsSync(dirPath)){
    fs.mkdirSync(dirPath);
  }
};

const createStagingDoc = () => {
  mkdirSync(stagingPath);

  fs.writeFileSync(path.resolve(stagingPath, '_id'), `medic:medic:test-${BUILD_NUMBER}`);
  mkdirSync(stagingAttachmentsPath);
};

const populateStagingDoc = () => {
  const ddocAttachmentsPath = path.resolve(stagingAttachmentsPath, 'ddocs');
  mkdirSync(ddocAttachmentsPath);

  fs.readdirSync(ddocsBuildPath, { withFileTypes: true }).forEach(file => {
    if (!file.isDirectory()) {
      fs.copyFileSync(path.resolve(ddocsBuildPath, file.name), path.resolve(ddocAttachmentsPath, file.name));
    }
  });

  // the validate_doc_update from staging.dev requires full build info in the staging document.
  copyBuildInfo(path.resolve(stagingPath, 'build_info'));
  saveDockerComposeFiles();
  saveServiceTags();
};

const copyBuildInfo = (destPath) => {
  const medicBuildInfoPath = path.resolve(ddocsBuildPath, 'medic-db', 'medic', 'build_info');
  mkdirSync(destPath);

  fs.readdirSync(medicBuildInfoPath, { withFileTypes: true }).forEach(file => {
    if (!file.isDirectory()) {
      fs.copyFileSync(path.resolve(medicBuildInfoPath, file.name), path.resolve(destPath, file.name));
    }
  });
};

const saveDockerComposeFiles = (dockerComposeFolder) => {
  const servicesTemplatePath = path.resolve(__dirname, 'cht-core.yml.template');
  const singleCouchDbTemplatePath = path.resolve(__dirname, 'cht-couchdb-single-node.yml.template');
  const clusteredCouchDbTemplatePath = path.resolve(__dirname, 'cht-couchdb-cluster.yml.template');

  const servicesTemplate = fs.readFileSync(servicesTemplatePath, 'utf-8');
  const singleCouchDbTemplate = fs.readFileSync(singleCouchDbTemplatePath, 'utf-8');
  const clusteredCouchDbTemplate = fs.readFileSync(clusteredCouchDbTemplatePath, 'utf-8');

  const view = {
    repo: versions.getRepo(ECR_PUBLIC_REPO),
    tag: versions.getImageTag(undefined, true),
    db_name: 'medic',
    couchdb_servers: 'couchdb',
  };
  const viewClustered = {
    ...view,
    couchdb_servers: 'couchdb-1.local,couchdb-2.local,couchdb-3.local',
  };

  const compiledServicesDockerCompose = mustache.render(servicesTemplate, view);
  const compiledCouchDbDockerCompose = mustache.render(singleCouchDbTemplate, view);
  const compiledClusteredCouchDbDockerCompose = mustache.render(clusteredCouchDbTemplate, viewClustered);

  dockerComposeFolder = dockerComposeFolder || path.resolve(stagingAttachmentsPath, 'docker-compose');
  mkdirSync(dockerComposeFolder);

  const servicesDockerComposeFilePath = path.resolve(dockerComposeFolder, 'cht-core.yml');
  fs.writeFileSync(servicesDockerComposeFilePath, compiledServicesDockerCompose);

  const couchDbDockerComposeFilePath = path.resolve(dockerComposeFolder, 'cht-couchdb.yml');
  fs.writeFileSync(couchDbDockerComposeFilePath, compiledCouchDbDockerCompose);

  const clusteredCouchDbDockerComposeFilePath = path.resolve(dockerComposeFolder, 'cht-couchdb-clustered.yml');
  fs.writeFileSync(clusteredCouchDbDockerComposeFilePath, compiledClusteredCouchDbDockerCompose);
};

const localDockerComposeFiles = () => {
  saveDockerComposeFiles(localBuildPath);
};

const saveServiceTags = () => {
  const tags = [...versions.SERVICES, ...versions.INFRASTRUCTURE].map(service => ({
    container_name: `cht-${service}`,
    image: versions.getImageTag(service, true),
  }));
  const tagsFilePath = path.resolve(stagingPath, 'tags.json');
  fs.writeFileSync(tagsFilePath, JSON.stringify(tags));
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
  const version = versions.getVersion();
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

const exec = async (command, args, options) => {
  options.stdio = 'inherit';
  const ci = spawn(command, args, options);
  await new Promise((resolve, reject) => {
    ci.on('close', (code) => {
      if (code === 0) {
        return resolve();
      }
      return reject(`${command} exited with ${code}`);
    }); 
  });
};

const npmCiModules = async () => {
  for (const cwd of MODULES) {
    console.log(`\n\nRunning "npm ci" on ${cwd}\n\n`);
    await exec('npm', ['ci'], { cwd });
  }
};

module.exports = {
  createStagingDoc,
  localDockerComposeFiles,
  npmCiModules,
  populateStagingDoc,
  setBuildInfo,
  setDdocsVersion,
  updateServiceWorker,
};
