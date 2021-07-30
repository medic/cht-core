const environment = require('../environment');
const serverUtils = require('../server-utils');

module.exports = {
  name: 'add-national_admin-role',
  created: new Date(2017, 3, 30),
  run: () => {
    return Promise.resolve()
      .then(() => serverUtils.addRoleToSecurity('_users', 'national_admin', true))
      .then(() => serverUtils.addRoleToSecurity(environment.db, 'national_admin', true));
  }
};
