#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');

const constants = require('./../tests/constants');
const utils = require('../tests/utils');

const WRITE_TIMESTAMPS = false;
const WRITE_TO_CONSOLE = false;

const writeToStream = (stream, data) => {
  const formattedData = WRITE_TIMESTAMPS ? `${new Date().toISOString()} ${data}` : data.toString();
  stream.write(formattedData);

  if (WRITE_TO_CONSOLE) {
    console.log(formattedData);
  }
};

const startServer = serviceName => new Promise((resolve, reject) => {
  if(!fs.existsSync('tests/logs')) {
    fs.mkdirSync('tests/logs');
  }
  
  try {
    const logStream = fs.createWriteStream(`tests/logs/${serviceName}.e2e.log`, { flags:'w' });

    const server = fork(`server.js`, {
      stdio: 'pipe',
      detached: false,
      cwd: path.join(process.cwd(), serviceName),
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

console.log(`To see service log files:

	tail -f logs/api.e2e.log
	tail -f logs/sentinel.e2e.log

Starting e2e test services…`);

startAll().then(() => console.log('[e2e] All services started.'));
