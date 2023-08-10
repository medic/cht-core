const environment = require('../environment');
const db = require('../db');


module.exports = {
  name: 'add-national_admin-role',
  created: new Date(2017, 3, 30),
  run: () => {
    return Promise.resolve()
      .then(() => db.addRoleAsMember('_users', 'national_admin'))
      .then(() => db.addRoleAsMember(environment.db, 'national_admin'));
  }
};
