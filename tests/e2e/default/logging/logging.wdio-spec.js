const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const constants = require('@constants');

describe('audit log', () => {
  const auth = {
    username: constants.USERNAME,
    password: constants.PASSWORD
  };

  it('should not log bodies', async () => {
    const collectAuditLogs = await utils.collectHaproxyLogs(/POST,\/_session/);
    await loginPage.login(auth);
    const auditLogs = (await collectAuditLogs()).filter(log => log.length);
    expect(auditLogs.length).to.equal(1);
    expect(auditLogs[0]).to.not.contain(`password`);
  });

  it('should not log bodies on replication request', async () => {
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
    expect(auditLogs[0]).to.not.contain('password');
  });
});
