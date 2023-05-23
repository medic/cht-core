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
  return await runDockerCommand('docker-compose', ['up', '--build', '--force-recreate'], env);
};
const getLogs = async () => {
  const containerName = (await runDockerCommand('docker-compose', ['ps', '-q', '-a']))[0];
  const logs = await runDockerCommand('docker', ['logs', containerName]);
  try {
    return logs && logs.filter(log => log).map(log => JSON.parse(log));
  } catch (err) {
    console.log(logs);
    throw err;
  }
};

describe('accessing couch_httpd', () => {
  it('should not be available to the host', async () => {
    await expect(
      utils.request({ uri: `https://localhost:5986/_dbs/${constants.DB_NAME}` })
    ).to.be.rejectedWith('Error: connect ECONNREFUSED 127.0.0.1:5986');
  });

  it('should block unauthenticated access through docker network', async () => {
    await startContainer();
    const logs = await getLogs();
    expect(logs.length).to.equal(1);
    expect(logs[0]).to.deep.equal({ error: 'unauthorized', reason: 'Authentication required.' });
  });

  it('should allow authenticated access through docker network', async () => {
    await startContainer(true);
    const logs = await getLogs();
    expect(logs.length).to.equal(1);
    const metadata = logs[0];
    expect(metadata._id).to.equal(constants.DB_NAME);
    // 12 shards, evenly distributed across 3 nodes
    expect(Object.keys(metadata.by_range).length).to.equal(12);
    expect(metadata.by_node).to.have.keys([
      'couchdb@couchdb-1.local', 'couchdb@couchdb-2.local', 'couchdb@couchdb-3.local'
    ]);
    expect(metadata.by_node['couchdb@couchdb-1.local'].length).to.equal(4);
    expect(metadata.by_node['couchdb@couchdb-2.local'].length).to.equal(4);
    expect(metadata.by_node['couchdb@couchdb-3.local'].length).to.equal(4);
  });
});
