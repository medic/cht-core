const { expect } = require('chai');
const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const constants = require('@constants');

const auth = {
  username: constants.USERNAME,
  password: constants.PASSWORD
};

describe('audit log', () => {

  it('should mask password on login', async () => {
    const collectAuditLogs = await utils.collectHaproxyLogs(/POST,\/_session/);
    await loginPage.login(auth);
    const auditLogs = (await collectAuditLogs()).filter(log => log.length);
    expect(auditLogs.length).to.equal(1);
    expect(auditLogs[0]).to.contain(`{"name":"${constants.USERNAME}","password":"***"}`);
  });

  it('should mask password on replication request', async () => {
    const collectAuditLogs = await utils.collectHaproxyLogs(/POST,\/_session/);
    const requestOptions = {
      path: '/_session',
      method: 'POST',
      body: `name=${constants.USERNAME}&password=${constants.PASSWORD}`,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      noAuth: true
    };
    await utils.request(requestOptions);
    const auditLogs = (await collectAuditLogs()).filter(log => log.length);
    expect(auditLogs.length).to.equal(1);
    expect(auditLogs[0]).to.contain('name=admin&password=***');
  });

  it('should mask password basic auth header', async () => {
    const collectAuditLogs = await utils.collectHaproxyLogs(/POST,\/_replicator/);
    const body = {
      user_ctx: { name: 'medic', roles: [ '_admin', '_reader', '_writer' ]},
      source: { url: 'https://localhost/source', headers: { Authorization: 'Basic bWVkaWM6cGFzc3dvcmQ=' } },
      target: { url: 'https://localhost/target', headers: { Authorization: 'Basic bWVkaWM6cGFzc3dvcmQ=' } },
      create_target: false,
      continuous: false
    };
    const requestOptions = {
      resolveWithFullResponse: true,
      path: '/_replicator',
      method: 'POST',
      body
    };
    await utils.request(requestOptions);
    const auditLogs = (await collectAuditLogs()).filter(log => log.length);
    expect(auditLogs.length).to.equal(1);
    expect(auditLogs[0]).to.contain('{"Authorization":"Basic ***"}');
  });

});
