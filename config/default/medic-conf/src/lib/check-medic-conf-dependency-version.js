/**
 * Attempt to check that the version of medic-conf that a project relies on
 * matches the version of medic-conf being used to configure that project.
 */

const fs = require('./sync-fs');
const semver = require('semver');
const { warn } = require('./log');

const runningVersion = require('../../package.json').version;

module.exports = projectDir => {
  const projectVersion = readRequestedVersion(projectDir);
  if(!projectVersion) {
    warn('Project has no dependency on medic-conf.');
    return;
  }

  const majorRunningVersion = semver.major(runningVersion);
  let upgradeDowngradeLocalMsg = '';
  let upgradeDowngradeProjectMsg = '';
  let satisfiesLessThanMajorRunningVersion = semver.satisfies(projectVersion, `<${majorRunningVersion}.x`);
  let satisifiesGreaterThanRunningVersion = semver.satisfies(projectVersion, `>${runningVersion}`);

  if(satisfiesLessThanMajorRunningVersion || satisifiesGreaterThanRunningVersion) {
    
    if(satisfiesLessThanMajorRunningVersion) {
      upgradeDowngradeLocalMsg = 'Downgrade';
      upgradeDowngradeProjectMsg = 'update';
    }
    else if(satisifiesGreaterThanRunningVersion)
    {
      upgradeDowngradeLocalMsg = 'Upgrade';
      upgradeDowngradeProjectMsg = 'downgrade';
    }

    throw new Error(`Your medic-conf version is incompatible with the project's medic-conf version:
    Your local medic-conf version:   ${runningVersion}
    The project medic-conf version: ${projectVersion}
    
    Continuing without updating could cause this project to not compile or work as expected.
    
    ${upgradeDowngradeLocalMsg} your local medic-conf with:
        npm i -g medic-conf@${projectVersion}
    and try again, or ${upgradeDowngradeProjectMsg} the project medic-conf version to ${runningVersion}, or ignore this warning with --skip-dependency-check
    `);
  
  }
};

function readRequestedVersion(projectDir) {
  const path = `${projectDir}/package.json`;

  if(!fs.exists(path)) {
    warn(`No project package.json file found at ${path}`);
    return;
  }

  const json = fs.readJson(path);
  return (json.dependencies    && json.dependencies['medic-conf']) ||
         (json.devDependencies && json.devDependencies['medic-conf']);
}
