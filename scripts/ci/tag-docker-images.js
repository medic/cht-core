const { spawn } = require('child_process');

const buildVersions = require('../build/versions');

const dockerCmd = (...params) => new Promise((resolve, reject) => {
  console.log('docker', ...params);
  const proc = spawn('docker', params);
  proc.on('error', (err) => {
    console.error('Error while running docker command', err);
    reject(err);
  });
  const log = data => console.log(data.toString());
  proc.stdout.on('data', log);
  proc.stderr.on('data', log);

  proc.on('close', () => resolve());
});

const regctlCmd = (...params) => new Promise((resolve, reject) => {
  console.log('retctl', ...params);
  const proc = spawn('regct', params);
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

    await dockerCmd('pull', existentTag);
    await dockerCmd('image', 'tag', existentTag, releaseTag);
    await dockerCmd('push', releaseTag);
  }

  for (const service of 
    [...buildVersions.MULTIPLATFORM_INFRASTRUCTURE]) {
    const existentTag = buildVersions.getImageTag(service);
    const releaseTag = buildVersions.getImageTag(service, true);
    await regctlCmd('image', 'copy', existentTag, releaseTag);
  }
})();
