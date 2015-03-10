var fs = require('fs'),
    async = require('async'),
    db = require('./db');

var hasRun = function(meta, migration) {
  if (!meta || !meta.migrations) {
    return false;
  }
  return meta.migrations.indexOf(migration.name) !== -1;
};

var error = function(migration, err) {
  return 'Migration "' + migration.name + '" failed with: ' + JSON.stringify(err);
};

var getMeta = function(callback) {
  db.getView('meta', { include_docs: true }, function(err, meta) {
    if (err) {
      return callback(err);
    }
    meta = meta && meta.rows && meta.rows[0] && meta.rows[0].doc;
    if (!meta) {
      meta = { type: 'meta' };
    }
    if (!meta.migrations) {
      meta.migrations = [];
    }
    callback(null, meta);
  });
};

var runMigration = function(migration, callback) {
  migration.run(function(err) {
    if (err) {
      return callback(error(migration, err));
    }
    getMeta(function(err, meta) {
      if (err) {
        return callback(error(migration, err));
      }
      meta.migrations.push(migration.name);
      db.saveDoc(meta, function(err) {
        if (err) {
          return callback(error(migration, err));
        }
        console.log('Migration "' + migration.name + '" completed successfully');
        callback();
      });
    });
  });
};

module.exports = {
  run: function(callback) {
    getMeta(function(err, meta) {
      if (err) {
        return callback(err);
      }
      module.exports.get(function(err, migrations) {
        if (err) {
          return callback(err);
        }
        async.eachSeries(
          migrations,
          function(migration, callback) {
            if (hasRun(meta, migration)) {
              // already run
              return callback();
            }
            runMigration(migration, callback);
          },
          callback
        );
      });
    });
  },
  get: function(callback) {
    fs.readdir(__dirname + '/migrations', function(err, files) {
      if (err) {
        return callback(err);
      }
      callback(null, files.map(function(file) {
        return require(__dirname + '/migrations/' + file);
      }));
    });
  }
};