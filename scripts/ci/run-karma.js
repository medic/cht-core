const { resolve } = require('path');
const parseConfig = require('karma').config.parseConfig;
const Server = require('karma').Server;

const getConfig = async () => {
  return parseConfig(
    resolve('admin/tests/karma-unit.conf.js'),
    { browsers: ['Chrome_Headless'], singleRun: true },
    { promiseConfig: true, throwErrors: true }
  );
};

(async () => {
  const config = await getConfig(); 
  const server = new Server(config);
  await server.start();
})();
