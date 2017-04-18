var url = require('url'),
    auth;

var getKansorc = function() {
  try {
    return require('../../.kansorc');
  } catch(e) {}
};

var setAuth = function(user, pass) {
  auth = {
    user: user,
    pass: pass,
  };
};

module.exports = function() {
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
        setAuth(parsed[0], parsed[1]);
      }
    } else {
      // might be running on travis - create a user
      setAuth('admin', 'pass');
    }
  }
  return auth;
};
