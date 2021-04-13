const path = require('path');
const fs = require('./sync-fs');
const { warn } = require('./log');

const throwError = (err) => {
  throw new Error(`Error parsing purge: ${err}`);
};

module.exports = (projectDir) => {
  const purgePath = path.join(projectDir, 'purge.js');
  const purgingPath = path.join(projectDir, 'purging.js');

  const purgeExists = fs.exists(purgePath);
  const purgingExists = fs.exists(purgingPath);

  if (purgeExists && purgingExists) {
    throwError(`Purge is defined at both ${purgePath} and ${purgingPath}. Using 'purging.js' is deprecated. Create a 'purge.js' file instead.`);
  }

  let purgeConfig;
  if (purgeExists) {
    try {
      purgeConfig = require(purgePath);
    } catch (err) {
      warn('Expecting purge.js to module.exports={} purge configuration');
      throwError(err);
    }

    if (purgeConfig.fn) {
      if (typeof purgeConfig.fn !== 'function') {
        throwError('Expecting purge.js fn export to be a function');
      }
      purgeConfig.fn = purgeConfig.fn.toString();
    }

    return purgeConfig;
  }

  // Backwards compatibility with older configurations, where `purge` settings were wrongly parsed from `purging`
  // see https://github.com/medic/medic-conf/issues/130
  if (purgingExists) {
    warn('Warning: Storing your purge function in `purging.js` is deprecated. Create a `purge.js` file instead.');
    const purgeFnString = fs.read(purgingPath);
    let purgeFn;
    try {
      purgeFn = eval(`(${purgeFnString})`);
    } catch (err) {
      warn('Unable to parse purging.js');
      throwError(err);
    }

    if (typeof purgeFn !== 'function') {
      throwError('Configured purging.js does not contain a function');
    }

    const appSettings = fs.readJson(path.join(projectDir, 'app_settings.json'));
    purgeConfig = appSettings.purging || {};
    purgeConfig.fn = purgeFnString;

    return purgeConfig;
  }
};
