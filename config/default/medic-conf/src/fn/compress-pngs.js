const environment = require('../lib/environment');
const exec = require('../lib/exec-promise');
const fs = require('../lib/sync-fs');
const { info, trace } = require('../lib/log');

module.exports = {
  requiresInstance: false,
  execute: () =>
    fs.recurseFiles(environment.pathToProject)
      .filter(name => name.endsWith('.png'))
      .reduce((promiseChain, png) =>
        promiseChain
          .then(() => info('Compressing PNG:', png, '…'))
          .then(() =>
              exec(['pngout-medic', `'${png}'`])
                .then(() => trace('Compressed', png))
                .catch(e => {
                  if(e.status === 2) {
                    info('Unable to compress further.');
                  } else throw e;
                })),
        Promise.resolve())
};
