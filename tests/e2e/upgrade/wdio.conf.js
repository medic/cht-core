const path = require('path');
const fs = require('fs');
const os = require('os');
const chai = require('chai');
const { spawn } = require('child_process');
chai.use(require('chai-exclude'));
const rpn = require('request-promise-native');

const utils = require('../../utils');
const wdioBaseConfig = require('../default/wdio.conf');
const constants = require('../../constants');

constants.DB_NAME = 'medic';
const { MARKET_URL_READ, STAGING_SERVER, HAPROXY_PORT } = process.env;

utils.CONTAINER_NAMES.haproxy = 'cht-haproxy';
utils.CONTAINER_NAMES.couch1 = 'cht-couchdb';
utils.CONTAINER_NAMES.api = 'cht-api';
utils.CONTAINER_NAMES.sentinel = 'cht-sentinel';
utils.CONTAINER_NAMES.upgradeService = 'cht-upgrade-service';

const UPGRADE_SERVICE_DOCKER_COMPOSE_FOLDER = utils.makeTempDir('upgrade-service-');
const CHT_DOCKER_COMPOSE_FOLDER = utils.makeTempDir('cht-');
const CHT_DATA_FOLDER = utils.makeTempDir('cht-');
const UPGRADE_SERVICE_DC = path.join(UPGRADE_SERVICE_DOCKER_COMPOSE_FOLDER, 'cht-upgrade-service.yml');
const MAIN_BRANCH = 'medic:medic:7826-dupe-public-ecr';

const COMPOSE_FILES = ['cht-core', 'cht-couchdb'];
const getUpgradeServiceDockerCompose = async () => {
  const contents = (await rpn.get('https://raw.githubusercontent.com/medic/cht-upgrade-service/main/docker-compose.yml'));
  await fs.promises.writeFile(UPGRADE_SERVICE_DC, contents);
};

const getMainCHTDockerCompose = async () => {
  for (const composeFile of COMPOSE_FILES) {
    const composeFileUrl = `${MARKET_URL_READ}/${STAGING_SERVER}/${MAIN_BRANCH}/docker-compose/${composeFile}.yml`;
    const contents = await rpn.get(composeFileUrl);
    const filePath = path.join(CHT_DOCKER_COMPOSE_FOLDER, `${composeFile}.yml`);
    await fs.promises.writeFile(filePath, contents);
  }
};

const testTimeout = 250 * 1000;

const dockerComposeCmd = (...params) => {
  const env = {
    ...process.env,
    HAPROXY_PORT,
    CHT_COMPOSE_PATH: CHT_DOCKER_COMPOSE_FOLDER,
    COUCHDB_USER: constants.USERNAME,
    COUCHDB_PASSWORD: constants.PASSWORD,
    DOCKER_CONFIG_PATH: path.join(os.homedir(), '.docker'),
    COUCHDB_DATA: CHT_DATA_FOLDER,
  };

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
    await utils.tearDownServices();
    process.exit(1);
  }, testTimeout);
};

// Override specific properties from wdio base config
const upgradeConfig = Object.assign(wdioBaseConfig.config, {
  specs: [
    './tests/e2e/upgrade/upgrade.wdio-spec.js',
    './tests/e2e/upgrade/*.wdio-spec.js'
  ],
  exclude: [],

  onPrepare: async () => {
    await getUpgradeServiceDockerCompose();
    await getMainCHTDockerCompose();
    await startUpgradeService();
    const tooLongTimeout = servicesStartTimeout();
    await utils.listenForApi();
    clearTimeout(tooLongTimeout);
  },
  mochaOpts: {
    ui: 'bdd',
    timeout: testTimeout,
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
