require('../../aliases');
const constants = require('@constants');
constants.DB_NAME = 'medic';

const path = require('path');
const fs = require('fs');
const os = require('os');
const chai = require('chai');
chai.use(require('chai-exclude'));
const semver = require('semver');

const utils = require('@utils');
const wdioBaseConfig = require('../../wdio.conf');
const { generateReport } = require('@utils/allure');

const {
  MARKET_URL_READ = 'https://staging.dev.medicmobile.org',
  STAGING_SERVER = '_couch/builds_4',
  HAPROXY_PORT,
  BASE_VERSION = 'latest',
  TAG,
} = process.env;
const CHT_COMPOSE_PROJECT_NAME = 'cht-upgrade';

const UPGRADE_SERVICE_DOCKER_COMPOSE_FOLDER = utils.makeTempDir('upgrade-service-');
const CHT_DOCKER_COMPOSE_FOLDER = utils.makeTempDir('cht-');
const CHT_DATA_FOLDER = utils.makeTempDir('cht-');
const UPGRADE_SERVICE_DC = path.join(UPGRADE_SERVICE_DOCKER_COMPOSE_FOLDER, 'cht-upgrade-service.yml');
const MAIN_BRANCH = 'medic:medic:master';

const COMPOSE_FILES = ['cht-core', 'cht-couchdb'];
const getUpgradeServiceDockerCompose = async () => {
  const contents = await utils.request({
    uri: 'https://raw.githubusercontent.com/medic/cht-upgrade-service/main/docker-compose.yml',
    json: false,
    noAuth: true,
  });
  await fs.promises.writeFile(UPGRADE_SERVICE_DC, contents);
};

const getReleasesQuery = () => {
  const startKey = ['release', 'medic', 'medic'];
  if (TAG) {
    const version = semver.parse(TAG);
    startKey.push(version.major, version.minor, version.patch);
  } else {
    startKey.push({});
  }
  return {
    start_key: JSON.stringify(startKey),
    descending: true,
    limit: TAG ? 2 : 1,
  };
};

const getRelease = async () => {
  if (BASE_VERSION !== 'latest') {
    return `medic:medic:${BASE_VERSION}`;
  }

  const url = `${MARKET_URL_READ}/${STAGING_SERVER}/_design/builds/_view/releases`;
  const releases = await utils.request({
    url: url,
    qs: getReleasesQuery(),
    noAuth: true,
  });

  if (!releases.rows.length) {
    return MAIN_BRANCH;
  }

  return releases.rows.at(-1).id;
};

const getMainCHTDockerCompose = async () => {
  const release = await getRelease();
  for (const composeFile of COMPOSE_FILES) {
    const composeFileUrl = `${MARKET_URL_READ}/${STAGING_SERVER}/${release}/docker-compose/${composeFile}.yml`;
    const contents = await utils.request({
      uri: composeFileUrl,
      json: false,
      noAuth: true,
    });
    const filePath = path.join(CHT_DOCKER_COMPOSE_FOLDER, `${composeFile}.yml`);
    await fs.promises.writeFile(filePath, contents);
  }
};

const TEST_TIMEOUT = 240 * 1000; // 4 minutes
const env = {
  ...process.env,
  HAPROXY_PORT,
  CHT_COMPOSE_PATH: CHT_DOCKER_COMPOSE_FOLDER,
  COUCHDB_USER: constants.USERNAME,
  COUCHDB_PASSWORD: constants.PASSWORD,
  DOCKER_CONFIG_PATH: os.homedir(),
  COUCHDB_DATA: CHT_DATA_FOLDER,
  CHT_COMPOSE_PROJECT_NAME: CHT_COMPOSE_PROJECT_NAME,
  CHT_NETWORK: 'cht-net-upgrade',
};

const upgradeServiceCmd = (command) => {
  command = `docker compose -f ${UPGRADE_SERVICE_DC} -p upgrade ${command}`;

  return utils.runCommand(command, { verbose: true, overrideEnv: env });
};
const exit = () => upgradeServiceCmd('down');

const startUpgradeService = async () => {
  await upgradeServiceCmd('up -d');
  let retries = 20;
  do {
    const response = await upgradeServiceCmd('ps -q');
    if (response.length) {
      return;
    }
    await utils.delayPromise(500);
  } while (--retries);
};

const tearDownServices = async () => {
  const composeFilesParam = COMPOSE_FILES
    .map(composeFile => '-f ' + path.join(CHT_DOCKER_COMPOSE_FOLDER, `${composeFile}.yml`))
    .join(' ');
  const cmd = `docker compose ${composeFilesParam} -p ${CHT_COMPOSE_PROJECT_NAME} down -t 0 --remove-orphans --volumes`;
  await utils.runCommand(cmd, { verbose: true, overrideEnv: env });

  await exit();
};

const servicesStartTimeout = () => {
  return setTimeout(async () => {
    console.warn('Services took too long to start. Shutting down...');
    console.info(`
      If you are seeing this locally, it can mean that your internet is too slow to download all images in the
      allotted time.
      Either run the test multiple times until you load all images, download images manually or increase this timeout.
    `);
    await tearDownServices();
    process.exit(1);
  }, TEST_TIMEOUT);
};

// Override specific properties from wdio base config
const upgradeConfig = Object.assign(wdioBaseConfig.config, {
  specs:
    // order is important, because we want to upgrade from an older version to current version. validate the upgrade
    // and then upgrade to master
    [
      'upgrade.wdio-spec.js',
      'admin-user.wdio-spec.js',
      'webapp.wdio-spec.js',
      'upgrade-master.wdio-spec.js',
    ],
  exclude: [],

  onPrepare: async () => {
    utils.updateContainerNames(CHT_COMPOSE_PROJECT_NAME);
    await getUpgradeServiceDockerCompose();
    await getMainCHTDockerCompose();
    await startUpgradeService();
    const tooLongTimeout = servicesStartTimeout();
    await utils.listenForApi();
    clearTimeout(tooLongTimeout);
  },

  onComplete: async () => {
    await tearDownServices();
    await generateReport();
  },

  mochaOpts: {
    ui: 'bdd',
    timeout: TEST_TIMEOUT,
    bail: true
  },
});

//do something when app is closing
process.on('exit', exit);
//catches ctrl+c event
process.on('SIGINT', exit);
// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exit);
process.on('SIGUSR2', exit);

exports.config = upgradeConfig;
