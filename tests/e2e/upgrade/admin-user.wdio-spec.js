const utils = require('@utils');
const loginPage = require('@page-objects/default/login/login.wdio.page');
const userFactory = require('@factories/cht/users/users');

describe('admin users', () => {
  it('should allow to update the admin password and login successfully', async () => {
    const adminUser = userFactory.build({
      roles: ['admin'],
      contact: { name: 'Philip' },
      place: { name: 'place', type: 'district_hospital' },
    });
    await utils.createUsers([adminUser]);

    const membership = await utils.request({ path: '/_membership' });
    const nodes = membership.all_nodes;
    for (const nodeName of nodes) {
      await utils.request({
        method: 'PUT',
        path: `/_node/${nodeName}/_config/admins/${adminUser.username}`,
        body: `"${adminUser.password}"`,
      });
    }

    await loginPage.login({
      username: adminUser.username,
      password: adminUser.password,
      adminApp: true,
      resetPassword: false,
    });

    await utils.deleteUsers([adminUser]);
  });
});
