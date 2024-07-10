const { spawn } = require('child_process');
const path = require('path');
const constants = require('@constants');

const runDockerCommand = (command, params, env=process.env) => {
  return new Promise((resolve, reject) => {
    const cmd = spawn(command, params, { cwd: path.join(__dirname, 'keep-alive-script'), env });
    const output = [];
    const log = (data) => output.push(data.toString());
    cmd.on('error', reject);
    cmd.stdout.on('data', log);
    cmd.stderr.on('data', log);
    cmd.on('close', () => resolve(output.join(' ')));
  });
};

const runScript = async () => {
  const env = { ...process.env };
  env.USER = constants.USERNAME;
  env.PASSWORD = constants.PASSWORD;
  return await runDockerCommand('docker-compose', ['up', '--build', '--force-recreate'], env);
};
const getLogs = async () => {
  return await runDockerCommand('docker-compose', ['logs', '--no-log-prefix']);
};

describe('logging in through API directly', () => {
  after(async () => {
    await runDockerCommand('docker-compose', ['down', '--remove-orphans']);
  });

  it('should allow logins @docker', async () => {
    await runScript();
    const logs = await getLogs();

    console.log(logs);

    expect(logs).to.not.include('HTTP/1.1 400 Bad Request');

    expect(logs).to.include('HTTP/1.1 302 Found');
    expect(logs).to.include('Connection: keep-alive');
    expect(logs).to.include('Set-Cookie: AuthSession=');
    expect(logs).to.include('Set-Cookie: userCtx=');
  });
});
