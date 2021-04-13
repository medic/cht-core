#!/usr/bin/env node

const { error } = require('../lib/log');
require('../cli/check-node-version');

const runMedicConf = require('../lib/main');

(async () => {
  let returnCode;
  try {
    returnCode = await runMedicConf(process.argv, process.env);
  }
  catch (e) {
    error(e);
    returnCode = -1;
  }
  finally {
    process.exit(returnCode);
  }
})();
