const wdioBaseConfig = require('./wdio.conf');
const _ = require('lodash');
const utils = require('./utils');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

// Override specific properties from wdio base config
const standardConfig = _.merge(wdioBaseConfig.config, {
  specs: [
    './tests/e2e/standard-config/**/*.wdio-spec.js'
  ],
  
  onPrepare: async function () {
    await utils.prepServices({ suite: 'web' });
    await uploadStandardConfig();
  },
});

const uploadStandardConfig = async () => {
  try {
    console.log(`Executing medic-conf from Standard Config`);
    await exec(`npm ci`, { cwd: 'config/standard' });
    const { stdout } = await exec(`./node_modules/.bin/medic-conf --url=http://admin:pass@localhost:4988 --force --no-check`, 
      { cwd: 'config/standard' });
    console.log(`Executing medic-conf from Standard Config Completed: ${stdout}`);
    return stdout;
  } catch (err) {
    console.log(`Error encountered while executing medic-conf from Standard Config: ${err.message}`);
    return err.stdout;
  }
};

exports.config = standardConfig;
