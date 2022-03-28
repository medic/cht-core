const { spawn } = require('child_process');

const buildUtils = require('../build');

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

(async () => {
  for (const service of buildUtils.SERVICES) {
    const existentTag = buildUtils.getImageTag(service);
    const releaseTag = buildUtils.getImageTag(service, undefined, true);

    await dockerCmd('pull', existentTag);
    await dockerCmd('image', 'tag', existentTag, releaseTag);
    await dockerCmd('push', releaseTag);
  }
})();
