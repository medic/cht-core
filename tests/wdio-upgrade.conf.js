const path = require('path');
const fs = require('fs');
const os = require('os');

const auth = require('./auth')();
const wdioBaseConfig = require('./wdio.conf');
const constants = require('./constants');
constants.DB_NAME = 'medic';

const { MARKET_URL_READ, STAGING_SERVER, HAPROXY_PORT } = process.env;

const rpn = require('request-promise-native');

const utils = require('./utils');

utils.CONTAINER_NAMES.haproxy = 'cht-haproxy';
utils.CONTAINER_NAMES.couch1 = 'cht-couchdb';
utils.CONTAINER_NAMES.api = 'cht-api';
utils.CONTAINER_NAMES.sentinel = 'cht-sentinel';

const DOCKER_COMPOSE_FOLDER = fs.mkdtempSync(path.join(os.tmpdir(), 'upgrade-service-'));
const CHT_DOCKER_COMPOSE_FOLDER = fs.mkdtempSync(path.join(os.tmpdir(), 'cht-'));
const CHT_DATA_FOLDER = fs.mkdtempSync(path.join(os.tmpdir(), 'cht-'));
const UPGRADE_SERVICE_DC = path.join(DOCKER_COMPOSE_FOLDER, 'cht-upgrade-service.yml');
const mainBranch = 'medic:medic:archv3-with-different-name';

const chai = require('chai');
const { spawn } = require('child_process');
chai.use(require('chai-exclude'));

const COMPOSE_FILES = ['cht-core', 'cht-couchdb'];
const getUpgradeServiceDockerCompose = async () => {
  const contents = (await rpn.get('https://raw.githubusercontent.com/medic/cht-upgrade-service/main/docker-compose.yml'));
  await fs.promises.writeFile(UPGRADE_SERVICE_DC, contents);
};

const getMainCHTDockerCompose = async () => {
  for (const composeFile of COMPOSE_FILES) {
    const composeFileUrl = `${MARKET_URL_READ}/${STAGING_SERVER}/${mainBranch}/docker-compose/${composeFile}.yml`;
    const contents = await rpn.get(composeFileUrl);
    const filePath = path.join(CHT_DOCKER_COMPOSE_FOLDER, `${composeFile}.yml`);
    await fs.promises.writeFile(filePath, contents);
  }
};

const dockerComposeCmd = (...params) => {
  const env = {
    ...process.env,
    HAPROXY_PORT,
    CHT_COMPOSE_PATH: CHT_DOCKER_COMPOSE_FOLDER,
    COUCHDB_USER: auth.username,
    COUCHDB_PASSWORD: auth.password,
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
    await utils.listenForApi();
  },
  mochaOpts: {
    ui: 'bdd',
    timeout: 120 * 1000,
  },
});

const exit = () => dockerComposeCmd('down');

//do something when app is closing
process.on('exit', exit);
//catches ctrl+c event
process.on('SIGINT', exit);
// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exit);
process.on('SIGUSR2', exit);

exports.config = upgradeConfig;
