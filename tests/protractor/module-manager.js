const constants = require('./constants');
const spawn = require('child_process').spawn;
const utils = require('./utils');

const processes = [];
let stoppingAll = false;

const stopAll = () => {
  stoppingAll = true;
  processes.forEach(module => module.kill());
  processes.length = 0;
};

const startNodeModule = (dir, startOutput) => {
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

    child.on('exit', (code, signal) => {
      console.log(`[${dir}] exited with code ${code}`);
      if(code !== 0 && !stoppingAll) {
        console.log('Killing all processes…');
        stopAll();
      }
    });

    processes.push(child);
  });
};

module.exports = {
  startNodeModule: startNodeModule,
  stopAll: stopAll,
};
