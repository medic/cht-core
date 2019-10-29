#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { fork } = require('child_process');

const constants = require('../../tests/constants');
const utils = require('../../tests/utils');

// This is a dev dependency in the root package.json
const express = require('express');

const WRITE_TIMESTAMPS = false;
const WRITE_TO_CONSOLE = false;

const writeToStream = (stream, data) => {
  const formattedData = WRITE_TIMESTAMPS ? `${new Date().toISOString()} ${data}` : data.toString();
  stream.write(formattedData);

  if (WRITE_TO_CONSOLE) {
    console.log(formattedData);
  }
};

const startServer = (serviceName, append) => new Promise((resolve, reject) => {
  if(!fs.existsSync('tests/logs')) {
    fs.mkdirSync('tests/logs');
  }

  try {
    const logStream = fs.createWriteStream(`tests/logs/${serviceName}.e2e.log`, { flags: append ? 'a' : 'w' });

    const server = fork(`server.js`, {
      stdio: 'pipe',
      detached: false,
      cwd: path.join(process.cwd(), serviceName),
      env: {
        TZ: 'UTC',
        API_PORT: constants.API_PORT,
        COUCH_URL: utils.getCouchUrl(),
        COUCH_NODE_NAME: constants.COUCH_NODE_NAME,
        PATH: process.env.PATH,
      },
    });

    const writeToLogStream = data => writeToStream(logStream, data);
    server.stdout.on('data', writeToLogStream);
    server.stderr.on('data', writeToLogStream);
    server.on('close', code => writeToLogStream(`${serviceName} process exited with code ${code}`));
    resolve(server);
  } catch (err) {
    reject(err);
  }
});

console.log(`To see service log files:

	tail -F logs/api.e2e.log
	tail -F logs/sentinel.e2e.log

Starting e2e test services…`);

const app = express();
const processes = {};

app.post('/:server/:action', (req, res) => {
  const { server, action } = req.params;
  if (['stop', 'restart'].includes(action)) {
    if (['api', 'all'].includes(server)) {
      console.log('Stopping API...');
      processes.api && processes.api.kill();
      delete processes.api;
    }
    if (['sentinel', 'all'].includes(server)) {
      console.log('Stopping Sentinel...');
      processes.sentinel && processes.sentinel.kill();
      delete processes.sentinel;
    }
  }

  const promises = [];

  if (['start', 'restart'].includes(action)) {
    if (['api', 'all'].includes(server)) {
      console.log('Starting API...');
      promises.push(startServer('api', true).then(api => processes.api = api));
    }
    if (['sentinel', 'all'].includes(server)) {
      console.log('Starting Sentinel...');
      promises.push(startServer('sentinel', true).then(sentinel => processes.sentinel = sentinel));
    }
  }

  return Promise.all(promises).then(res.status(200).end());
});
app.post('/die', (req, res) => {
  console.log('Killing API / Sentinel service port');
  Object.values(processes).forEach(p => p.kill());
  res.status(200).end();
  process.exit(0);
});

const port = 31337;

app.listen(port);

console.log('API / Sentinel service port listening on', port);

Promise.all([
  startServer('api'),
  startServer('sentinel')
]).then(([api, sentinel]) => {
  processes.api = api;
  processes.sentinel = sentinel;
  console.log('[e2e] All services started.');
});
