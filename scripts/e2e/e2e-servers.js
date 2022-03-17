#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { fork, spawn } = require('child_process');

const constants = require('../../tests/constants');
const utils = require('../../tests/utils');

// This is a dev dependency in the root package.json
const express = require('express');

const COMPOSE_FILE = path.resolve(__dirname, '..', 'ci', 'cht-compose-test.yml');

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
    console.warn(serviceName, 'is already running');
    return resolve();
  }

  try {
    let server;
    if (constants.IS_CI) {
      server = spawn('docker-compose', [ '-f', COMPOSE_FILE, 'start', `cht-${serviceName}` ]);

      server.on('error', (err) => reject(err));
      server.stdout.on('data', (chunk) => console.log(chunk.toString()));
      server.stderr.on('data', (chunk) => console.error(chunk.toString()));

      server.on('close', resolve);
    } else {
      const logStream = fs.createWriteStream(`tests/logs/${serviceName}.e2e.log`, { flags: append ? 'a' : 'w' });
      // runs your local checked out api / sentinel
      server = fork(`server.js`, {
        stdio: 'pipe',
        detached: false,
        cwd: path.join(process.cwd(), serviceName),
        env: {
          TZ: 'UTC',
          API_PORT: constants.API_PORT,
          COUCH_URL: utils.getCouchUrl(),
          PATH: process.env.PATH,
        },
      });

      const writeToLogStream = data => writeToStream(logStream, data);
      server.stdout.on('data', writeToLogStream);
      server.stderr.on('data', writeToLogStream);
      server.on('close', code => writeToLogStream(`${serviceName} process exited with code ${code}`));
    }

    processes[serviceName] = server;
    resolve();
  } catch (err) {
    reject(err);
  }
});

const stopServer = (serviceName) => new Promise((res, rej) => {
  if (constants.IS_CI) {
    const pid = spawn('docker-compose', [ '-f', COMPOSE_FILE, 'stop', '-t', 1, `cht-${serviceName}` ]);
    console.log(['docker-compose', '-f', COMPOSE_FILE, 'stop', '-t', 1, `cht-${serviceName}` ].join(' '));

    pid.on('error', (err) => rej(err));
    pid.stdout.on('data', (chunk) => console.log(chunk.toString()));
    pid.stderr.on('data', (chunk) => console.error(chunk.toString()));

    pid.on('close', res);
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

const started = {
  api: false,
  sentinel: false,
};

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
      p = p.then(() => startServer('api', started.api)).then(() => started.api = true);
    }
    if (['sentinel', 'all'].includes(server)) {
      console.log('Starting Sentinel...');
      p = p.then(() => startServer('sentinel', started.sentinel)).then(() => started.sentinel = true);
    }
  }

  return p.then(() => res.status(200).end());
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
