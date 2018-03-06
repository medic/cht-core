const constants = require('./constants');
const spawn = require('child_process').spawn;
const utils = require('./utils');

const modules = [];

const startNodeModule = (dir, startOutput) => {
  return new Promise(resolve => {
    const module = spawn('node', ['server.js'], {
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
    module.stdout.on('data', data => {
      if (!started && data.toString().includes(startOutput)) {
        started = true;
        resolve();
      }
      console.log(`[${dir}] ${data}`);
    });
    module.stderr.on('data', data => {
      console.error(`[${dir}] ${data}`);
    });
    modules.push(module);
  });
};

module.exports = {
  startNodeModule: startNodeModule,
  stopAll: () => {
    modules.forEach(module => module.kill());
    modules.length = 0;
  },
};
