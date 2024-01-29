require('../../aliases');
const constants = require('@constants');
constants.DB_NAME = 'medic';

const path = require('path');
const fs = require('fs');
const os = require('os');
const chai = require('chai');
const { spawn } = require('child_process');
chai.use(require('chai-exclude'));
const rpn = require('request-promise-native');

const utils = require('@utils');
const wdioBaseConfig = require('../wdio.conf');

const { MARKET_URL_READ, STAGING_SERVER, HAPROXY_PORT } = process.env;
const CHT_COMPOSE_PROJECT_NAME = 'cht-upgrade';

const UPGRADE_SERVICE_DOCKER_COMPOSE_FOLDER = utils.makeTempDir('upgrade-service-');
const CHT_DOCKER_COMPOSE_FOLDER = utils.makeTempDir('cht-');
const CHT_DATA_FOLDER = utils.makeTempDir('cht-');
const UPGRADE_SERVICE_DC = path.join(UPGRADE_SERVICE_DOCKER_COMPOSE_FOLDER, 'cht-upgrade-service.yml');
const MAIN_BRANCH = 'medic:medic:master';

const COMPOSE_FILES = ['cht-core', 'cht-couchdb'];
const getUpgradeServiceDockerCompose = async () => {
  const contents = (await rpn.get('https://raw.githubusercontent.com/medic/cht-upgrade-service/main/docker-compose.yml'));
  await fs.promises.writeFile(UPGRADE_SERVICE_DC, contents);
};

const getLatestRelease = async () => {
  const url = `${MARKET_URL_READ}/${STAGING_SERVER}/_design/builds/_view/releases`;
  const query = {
    startKey: [ 'release', 'medic', 'medic', {}],
    descending: true,
    limit: 1,
  };
  const releases = await rpn.get({ url: url, qs: query, json: true });
  if (!releases.rows.length) {
    return MAIN_BRANCH;
  }
  return releases.rows[0].id;
};

const getMainCHTDockerCompose = async () => {
  const latestRelease = await getLatestRelease();
  for (const composeFile of COMPOSE_FILES) {
    const composeFileUrl = `${MARKET_URL_READ}/${STAGING_SERVER}/${latestRelease}/docker-compose/${composeFile}.yml`;
    const contents = await rpn.get(composeFileUrl);
    const filePath = path.join(CHT_DOCKER_COMPOSE_FOLDER, `${composeFile}.yml`);
    await fs.promises.writeFile(filePath, contents);
  }
};

const TEST_TIMEOUT = 240 * 1000; // 4 minutes

const dockerComposeCmd = (...params) => {
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

  params.unshift('-p', 'upgrade');

  return new Promise((resolve, reject) => {
    console.log(...['docker-compose', '-f', UPGRADE_SERVICE_DC, ...params ]);
    const cmd = spawn('docker-compose', [ '-f', UPGRADE_SERVICE_DC, ...params ], { env });
    const output = [];
    const log = (data, error) => {
      data = data.toString();
      output.push(data);
      error ? console.error(data) : console.log(data);
    };

    cmd.on('error', (err) => {
      console.error(err);
      reject(err);
    });
    cmd.stdout.on('data', log);
    cmd.stderr.on('data', log);

    cmd.on('close', () => resolve(output));
  });
};
const exit = () => dockerComposeCmd('down');

const startUpgradeService = async () => {
  await dockerComposeCmd('up', '-d');
  let retries = 20;
  do {
    const response = await dockerComposeCmd('ps', '-q');
    if (response.length) {
      return;
    }
    await utils.delayPromise(500);
  } while (--retries);
};

const servicesStartTimeout = () => {
  return setTimeout(async () => {
    console.warn('Services took too long to start. Shutting down...');
    console.info(`
      If you are seeing this locally, it can mean that your internet is too slow to download all images in the 
      allotted time. 
      Either run the test multiple times until you load all images, download images manually or increase this timeout.
    `);
    await utils.tearDownServices();
    process.exit(1);
  }, TEST_TIMEOUT);
};

// Override specific properties from wdio base config
const upgradeConfig = Object.assign(wdioBaseConfig.config, {
  specs:
   [
     'upgrade.wdio-spec.js',
     '*.wdio-spec.js'
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
  mochaOpts: {
    ui: 'bdd',
    timeout: TEST_TIMEOUT,
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
