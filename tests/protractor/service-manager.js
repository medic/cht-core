const constants = require('./constants');
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

const startServer = (dir, startOutput) => {
  return new Promise(resolve => {
    const child = spawn('node', ['server.js'], {
      cwd: dir,
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
      console.log(`[${dir}] ${data}`);
    });
    child.stderr.on('data', data => {
      console.error(`[${dir}] ${data}`);
    });

    child.on('exit', code => {
      console.log(`[${dir}] exited with code ${code}`);
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
           .then(() => startServer('sentinel', 'startup complete.'));

module.exports = {
  startAll: startAll,
  stopAll: stopAll,
};

// From orbit, just to be sure
process.on('exit', stopAll);
