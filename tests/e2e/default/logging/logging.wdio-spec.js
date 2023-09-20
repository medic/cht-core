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

  // <150>Sep 19 03:30:58 haproxy[12]: 172.22.0.7,couchdb,201,9,0,0,POST,/_replicator,-,medic,'{"user_ctx":{"name":"medic","roles":["_admin","_reader","_writer"]},"source":{"url":"https://192-168-50-17.local-ip.medicmobile.org:10443/medic","headers":{"Authorization":"Basic bWVkaWM6cGFzc3dvcmQ="}},"target":{"url":"https://192-168-50-17.local-ip.medicmobile.org:10443/medic2","headers":{"Authorization":"Basic bWVkaWM6cGFzc3dvcmQ="}},"create_target":false,"continuous":false}',421,9,95,'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/117.0'

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
