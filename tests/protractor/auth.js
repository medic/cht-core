var url = require('url'),
    auth;

var getKansorc = function() {
  try {
    return require('../../.kansorc');
  } catch(e) {}
};

module.exports = {
  getAuth: function() {
    if (!auth) {
      var kansorc = getKansorc();
      if (kansorc) {
        var dbUrl = kansorc.env && kansorc.env.default && kansorc.env.default.db;
        if (!dbUrl) {
          throw new Error('.kansorc must have db url configured');
        } else {
          var parsed = url.parse(kansorc.env.default.db).auth;
          if (!parsed) {
            throw new Error('auth component not found in DB url');
          }
          parsed = parsed.split(':');
          auth = {
            user: parsed[0],
            pass: parsed[1]
          };
        }
      } else {
        // might be running on travis - create a user
        auth = {
          user: 'admin',
          pass: 'pass'
        };
      }
    }
    return auth;
  },
  getAuthString: function() {
    module.exports.getAuth();
    return auth.user + ':' + auth.pass;
  }
};