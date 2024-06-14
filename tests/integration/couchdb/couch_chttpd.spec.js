const { spawn } = require('child_process');
const path = require('path');
const constants = require('@constants');
const utils = require('@utils');
const { expect } = require('chai');

const runDockerCommand = (command, params, env=process.env) => {
  return new Promise((resolve, reject) => {
    const cmd = spawn(command, params, { cwd: path.join(__dirname, 'couch_httpd_script'), env });
    const output = [];
    const log = (data) => output.push(data.toString().replace(/\n/g, ''));
    cmd.on('error', reject);
    cmd.stdout.on('data', log);
    cmd.stderr.on('data', log);
    cmd.on('close', () => resolve(output));
  });
};

const startContainer = async (useAuthentication) => {
  const env = { ...process.env };
  if (useAuthentication) {
    env.COUCH_AUTH = `${constants.USERNAME}:${constants.PASSWORD}`;
  }
  await runDockerCommand('docker-compose', ['up', '--build', '--force-recreate'], env);
};

const stopContainer = async () => {
  await runDockerCommand('docker-compose', ['down', '--remove-orphans']);
};

const getLogs = async () => {
  const containerName = (await runDockerCommand('docker-compose', ['ps', '-q', '-a']))[0];
  const logs = await runDockerCommand('docker', ['logs', containerName]);
  try {
    return logs?.filter(log => log).map(log => JSON.parse(log));
  } catch (err) {
    console.log(logs);
    throw err;
  }
};

const expectCorrectMetadata = (metadata) => {
  expect(metadata._id).to.equal(constants.DB_NAME);
  // 12 shards, evenly distributed across 3 nodes
  expect(Object.keys(metadata.by_range).length).to.equal(12);
  const nodeName = (nbr) => `couchdb@couchdb-${nbr}${utils.isK3D() ? `.${utils.PROJECT_NAME}.svc.cluster` : ''}.local`;
  expect(metadata.by_node).to.have.keys([nodeName(1), nodeName(2), nodeName(3)]);
  expect(metadata.by_node[nodeName(1)].length).to.equal(4);
  expect(metadata.by_node[nodeName(2)].length).to.equal(4);
  expect(metadata.by_node[nodeName(3)].length).to.equal(4);
};

describe('accessing couch clustering endpoint', () => {
  afterEach(async () => {
    await stopContainer();
  });

  it('should block unauthenticated access through the host network', async () => {
    await expect(
      utils.request({ uri: `https://${constants.API_HOST}/_node/_local/_dbs/${constants.DB_NAME}`, noAuth: true })
    ).to.be.rejectedWith(Error, 'unauthorized');
  });

  it('should allow authenticated access through host network', async () => {
    const metadata = await utils.request({ path: `/_node/_local/_dbs/${constants.DB_NAME}` });
    expectCorrectMetadata(metadata);
  });

  it('should block unauthenticated access through docker network @docker', async () => {
    await startContainer();
    const logs = await getLogs();
    expect(logs.length).to.equal(1);
    expect(logs[0]).to.deep.equal({ error: 'unauthorized', reason: 'Authentication required.' });
  });

  it('should allow authenticated access through docker network @docker', async () => {
    await startContainer(true);
    const logs = await getLogs();
    expect(logs.length).to.equal(1);
    const metadata = logs[0];
    expectCorrectMetadata(metadata);
  });
});

