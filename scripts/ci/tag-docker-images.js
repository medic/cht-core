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

  proc.on('close', (code, signal) => {
    if (code === 0) {
      return resolve();
    }

    const status = signal ? `signal ${signal}` : `exit code ${code}`;
    reject(new Error(`regctl ${params.join(' ')} failed with ${status}`));
  });
});

(async () => {
  for (const service of 
    [...buildVersions.SERVICES, ...buildVersions.INFRASTRUCTURE]) {
    const existentTag = buildVersions.getImageTag(service);
    const releaseTag = buildVersions.getImageTag(service, true);
    await regctlCmd('image', 'copy', existentTag, releaseTag);
  }
})().catch(error => {
  console.error('Failed to tag Docker images', error);
  process.exitCode = 1;
});
