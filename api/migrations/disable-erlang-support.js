var db = require('../db');

module.exports = {
  name: 'disable-erlang-support',
  created: new Date(2016, 10, 5),
  run: function(callback) {
    db.getCouchDbVersion(function(err, version) {
      if (err) {
        return callback(err);
      }

      var v1 = version.major === '1';

      db.request({
        db: v1 ?
          '_config' :
          '_node',
        method: 'DELETE',
        path: v1 ?
          'native_query_servers/erlang':
          process.env.COUCH_NODE_NAME + '/_config/native_query_servers/erlang',
      }, function(err) {
        if (err && err.error === 'not_found') {
          console.log('Erlang support is already disabled.');
          callback();
          return;
        }
        callback(err);
      });

    });
  }
};
