const fs = require('fs');
const { fork } = require('child_process');

const constants = require('./../tests/constants');
const utils = require('../tests/utils');

const WRITE_TIMESTAMPS = false;
const WRITE_TO_CONSOLE = false;

const writeToStream = (stream, data) => {
  const formattedData = WRITE_TIMESTAMPS ? `${new Date().toISOString()} ${data}` : data;
  stream.write(formattedData);

  if (WRITE_TO_CONSOLE) {
    console.log(formattedData);
  }
};

const startServer = (serviceName, startOutput, options={}) => new Promise((resolve, reject) => {
  if(!fs.existsSync('tests/logs')) {
    fs.mkdirSync('tests/logs');
  }
  
  try {
    const logStream = fs.createWriteStream(`tests/logs/${serviceName}.e2e.log`, { flags:'w' });

    const server = fork(`${serviceName}/server.js`, {
      stdio: 'pipe',
      detached: false,
      env: {
        TZ: 'UTC',
        API_PORT: constants.API_PORT,
        COUCH_URL: utils.getCouchUrl(),
        COUCH_NODE_NAME: process.env.COUCH_NODE_NAME,
        PATH: process.env.PATH,
      },
    });

    const writeToLogStream = data => writeToStream(logStream, data);
    server.stdout.on('data', writeToLogStream);
    server.stderr.on('data', writeToLogStream);
    server.on('close', code => writeToLogStream(`${serviceName} process exited with code ${code}`));
    resolve();
  } catch (err) {
    reject(err);
  }
});

const startApi = () => startServer('api');
const startSentinel = () => startServer('sentinel');
const startAll = () => Promise.all([startApi(), startSentinel()]);

module.exports = {
  startApi,
  startSentinel,
  startAll,
};
