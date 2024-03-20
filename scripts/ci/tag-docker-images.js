const { spawn } = require('child_process');

const buildVersions = require('../build/versions');

const regctlCmd = (...params) => new Promise((resolve, reject) => {
  console.log('regctl', ...params);
  const proc = spawn('regctl', params);
  proc.on('error', (err) => {
    console.error('Error while running regctl command', err);
    reject(err);
  });
  const log = data => console.log(data.toString());
  proc.stdout.on('data', log);
  proc.stderr.on('data', log);

  proc.on('close', () => resolve());
});

(async () => {
  for (const service of 
    [...buildVersions.SERVICES, ...buildVersions.INFRASTRUCTURE]) {
    const existentTag = buildVersions.getImageTag(service);
    const releaseTag = buildVersions.getImageTag(service, true);
    await regctlCmd('image', 'copy', existentTag, releaseTag);
  }
})();
