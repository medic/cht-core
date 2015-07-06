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
          console.log(JSON.stringify(url.parse(kansorc.env.default.db), null, 2));
          auth = url.parse(kansorc.env.default.db).auth;
          if (!auth) {
            throw new Error('auth component not found in DB url');
          }
        }
      } else {
        // might be running on travis - create a user
        auth = 'ci_test:pass';
      }
    }
    console.log('USING AUTH:' + auth);
    return auth;
  }
};