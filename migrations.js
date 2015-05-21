var fs = require('fs'),
    path = require('path'),
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
  db.medic.view('medic', 'meta', { include_docs: true }, function(err, meta) {
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

var sortMigrations = function(lhs, rhs) {
  return lhs.created - rhs.created;
};

var runMigration = function(migration, callback) {
  if (!migration.created) {
    return callback(new Error('Migration "' + migration.name + '" has no "created" date property'));
  }
  migration.run(function(err) {
    if (err) {
      return callback(error(migration, err));
    }
    getMeta(function(err, meta) {
      if (err) {
        return callback(error(migration, err));
      }
      meta.migrations.push(migration.name);
      db.medic.insert(meta, function(err) {
        if (err) {
          return callback(error(migration, err));
        }
        console.log('Migration "' + migration.name + '" completed successfully');
        callback();
      });
    });
  });
};

var runMigrations = function(meta, migrations, callback) {
  migrations.sort(sortMigrations);
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
        runMigrations(meta, migrations, callback);
      });
    });
  },
  get: function(callback) {
    var migrationsDir = path.join(__dirname, 'migrations');
    fs.readdir(migrationsDir, function(err, files) {
      if (err) {
        return callback(err);
      }
      callback(null, files.map(function(file) {
        return require(path.join(migrationsDir, file));
      }));
    });
  }
};