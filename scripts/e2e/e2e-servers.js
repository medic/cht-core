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
  try {
    const logStream = fs.createWriteStream(`tests/logs/${serviceName}.e2e.log`, { flags: append ? 'a' : 'w' });

    let server;
    if (constants.IS_TRAVIS) {
      server = spawn('horti-svc-start', [
        `${require('os').homedir()}/.horticulturalist/deployments`,
        `medic-${serviceName}`
      ]);
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

    const writeToLogStream = data => writeToStream(logStream, data);
    server.stdout.on('data', writeToLogStream);
    server.stderr.on('data', writeToLogStream);
    server.on('close', code => writeToLogStream(`${serviceName} process exited with code ${code}`));

    processes[serviceName] = server;
    resolve();
  } catch (err) {
    reject(err);
  }
});

const stopServer = (serviceName) => new Promise(res => {
  if (constants.IS_TRAVIS) {
    const pid = spawn('horti-svc-stop', [
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

if(!fs.existsSync('tests/logs')) {
  fs.mkdirSync('tests/logs');
}

const app = express();

app.post('/:server/:action', (req, res) => {
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
      p = p.then(() => startServer('api', true));
    }
    if (['sentinel', 'all'].includes(server)) {
      console.log('Starting Sentinel...');
      p = p.then(() => startServer('sentinel', true));
    }
  }

  return p.then(res.status(200).end());
});

app.post('/die', (req, res) => {
  console.log('Killing API / Sentinel service port');
  Promise.all([
    () => stopServer('api'),
    () => stopServer('sentinel'),
  ]).then(() => {
    res.status(200).end();
    process.exit(0);
  });
});

const port = 31337;

app.listen(port);

console.log('API / Sentinel service port listening on', port);
