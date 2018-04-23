const constants = require('./constants');
const fs = require('fs');
const spawn = require('child_process').spawn;
const utils = require('./utils');

const processes = [];
let stoppingAll = false;

const stopAll = (code) => {
  stoppingAll = true;
  processes.forEach(module => module.kill());
  processes.length = 0;

  // Don't wait for the timeout from `grunt e2e`
  process.exit(code);
};

const startServer = (serviceName, startOutput, options={}) => {
  if(!fs.existsSync('tests/logs')) {
    fs.mkdirSync('tests/logs');
  }
  const logStream = fs.createWriteStream(`tests/logs/${serviceName}.e2e.log`, { flags:'w' });
  const log = data => {
    if (options.logTimestamps) {
      data = `${new Date().toISOString()} ${data}`;
    }
    logStream.write(data);
  };

  return new Promise(resolve => {
    const child = spawn('node', ['server.js'], {
      cwd: serviceName,
      env: {
        TZ: 'UTC',
        API_PORT: constants.API_PORT,
        COUCH_URL: utils.getCouchUrl(),
        COUCH_NODE_NAME: process.env.COUCH_NODE_NAME,
        PATH: process.env.PATH
      }
    });
    let started = false;
    child.stdout.on('data', data => {
      if (!started && data.toString().includes(startOutput)) {
        started = true;
        resolve();
      }
      log(data);
    });
    child.stderr.on('data', data => {
      log(data);
    });

    child.on('exit', code => {
      logStream.end(`Exited with code ${code}.`);
      console.log(`[${serviceName}] exited with code ${code}`);
      if(!stoppingAll) {
        console.log('[e2e] Sending kill signals to all servers…');
        stopAll(code);
      }
    });

    processes.push(child);
  });
};

// start sentinel serially because it relies on api
const startAll = () => startServer('api', 'Medic API listening on port')
           .then(() => startServer('sentinel', 'startup complete.', { logTimestamps:true }));

module.exports = {
  startAll: startAll,
  stopAll: stopAll,
};

// From orbit, just to be sure
process.on('exit', stopAll);
