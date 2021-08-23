#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { fork, spawn } = require('child_process');

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

const processes = {};

const startServer = (serviceName, append) => new Promise((resolve, reject) => {
  if (processes[serviceName]) {
    console.log('travis already running 1');
    console.warn(serviceName, 'is already running');
    return resolve();
  }

  try {
    console.log('travis write stream 1');
    const logStream = fs.createWriteStream(`tests/logs/${serviceName}.e2e.log`, { flags: append ? 'a' : 'w' });
    console.log('travis write stream 2');
    let server;
    if (constants.IS_TRAVIS) {
      console.log('travis start');
      const path = '/root/.horticulturalist/deployments/horti-svc-start';
      server = spawn(path, [
        `medic-${serviceName}`
      ]);
      console.log('travis start 1');
    } else {
      // runs your local checked out api / sentinel
      server = fork(`server.js`, {
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
    }
    console.log('travis start 2');
    const writeToLogStream = data => writeToStream(logStream, data);
    console.log('travis start 3');
    server.stdout.on('data', writeToLogStream);
    console.log('travis start 4');
    server.stderr.on('data', writeToLogStream);
    console.log('travis start 5');
    server.on('close', code => writeToLogStream(`${serviceName} process exited with code ${code}`));

    processes[serviceName] = server;
    resolve();
  } catch (err) {
    console.log('travis start err');
    console.log(err);
    reject(err);
  }
});

const stopServer = (serviceName) => new Promise(res => {
  if (constants.IS_TRAVIS) {
    const path = '/root/.horticulturalist/deployments/horti-svc-stop';
    const pid = spawn(path, [
      `medic-${serviceName}`
    ]);

    pid.on('exit', res);
  } else {
    processes[serviceName] && processes[serviceName].kill();
    res();
  }
}).then(() => {
  delete processes[serviceName];
});

if (!fs.existsSync('tests/logs')) {
  fs.mkdirSync('tests/logs');
}

const app = express();

const started = {
  api: false,
  sentinel: false,
};

app.post('/:server/:action', (req, res, next) => {
  const { server, action } = req.params;
  let p = Promise.resolve();

  if (['stop', 'restart'].includes(action)) {
    if (['sentinel', 'all'].includes(server)) {
      console.log('Stopping Sentinel...');
      p = p.then(() => stopServer('sentinel'));
    }
    if (['api', 'all'].includes(server)) {
      console.log('Stopping API...');
      p = p.then(() => stopServer('api'));
    }
  }

  if (['start', 'restart'].includes(action)) {
    if (['api', 'all'].includes(server)) {
      console.log('Starting API...');
      p = p.then(() => startServer('api', started.api)).then(() => started.api = true).catch(next);
    }
    if (['sentinel', 'all'].includes(server)) {
      console.log('Starting Sentinel...');
      p = p.then(() => startServer('sentinel', started.sentinel)).then(() => started.sentinel = true).catch(next);
    }
  }

  return p.then(() => res.status(200).end());
});

app.get('/isRunning', (req, res) => {
  res.send('We are running');
});

app.post('/die', (req, res, next) => {
  console.log('Killing API / Sentinel service port');
  Promise.all([
    () => stopServer('api'),
    () => stopServer('sentinel'),
  ]).then(() => {
    res.status(200).end();
    process.exit(0);
  }).catch(next);
});

const port = 31337;

const server = app.listen(port);
server.setTimeout(0);
console.log('API / Sentinel service port listening on', port);
