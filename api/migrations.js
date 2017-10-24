const fs = require('fs'),
      path = require('path'),
      async = require('async'),
      db = require('./db'),
      MIGRATION_LOG_ID = 'migration-log',
      MIGRATION_LOG_TYPE = 'meta';

var hasRun = function(log, migration) {
  if (!log || !log.migrations) {
    return false;
  }
  return log.migrations.indexOf(migration.name) !== -1;
};

var getLogWithView = function(callback) {
  var options = { include_docs: true, key: [ MIGRATION_LOG_TYPE ] };
  db.medic.view('medic-client', 'doc_by_type', options, function(err, result) {
    if (err) {
      return callback(
        new Error(
          'Could not run migrations without doc_by_type view. Update ddoc. ' +
          JSON.stringify(err)));
    }
    var log = result && result.rows && result.rows[0] && result.rows[0].doc;
    callback(null, log);
  });
};

var deleteOldLog = function(oldLog, callback) {
  if (!oldLog) {
    return callback();
  }
  oldLog._deleted = true;
  db.medic.insert(oldLog, callback);
};

var createMigrationLog = function(callback) {
  getLogWithView(function(err, oldLog) {
    if (err) {
      return callback(err);
    }
    var newLog = {
      _id: MIGRATION_LOG_ID,
      type: MIGRATION_LOG_TYPE,
      migrations: (oldLog && oldLog.migrations) || []
    };
    db.medic.insert(newLog, function(err) {
      if (err) {
        return callback(err);
      }
      deleteOldLog(oldLog, function(err) {
        if (err) {
          return callback(err);
        }
        getLog(callback);
      });
    });
  });
};

var getLog = function(callback) {
  db.medic.get(MIGRATION_LOG_ID, function(err, doc) {
    if (err) {
      if (err.statusCode === 404) {
        return createMigrationLog(callback);
      }
      return callback(err);
    }
    callback(null, doc);
  });
};

var sortMigrations = function(lhs, rhs) {
  return lhs.created - rhs.created;
};

var runMigration = function(migration, callback) {
  if (!migration.created) {
    return callback(new Error(`Migration "${migration.name}" has no "created" date property`));
  }
  console.log(`Running migration ${migration.name}...`);
  migration.run(function(err) {
    if (err) {
      return callback(err);
    }
    getLog(function(err, log) {
      if (err) {
        return callback(err);
      }
      log.migrations.push(migration.name);
      db.medic.insert(log, callback);
    });
  });
};

var runMigrations = (log, migrations, callback) => {
  migrations.sort(sortMigrations);
  async.eachSeries(
    migrations,
    (migration, callback) => {
      if (hasRun(log, migration)) {
        // already run
        return callback();
      }
      runMigration(migration, err => {
        if (err) {
          console.error(`Migration ${migration.name} failed`);
        } else {
          console.log(`Migration ${migration.name} completed successfully`);
        }
        callback(err);
      });
    },
    callback
  );
};

module.exports = {
  run: function(callback) {
    getLog(function(err, log) {
      if (err) {
        return callback(err);
      }
      module.exports.get(function(err, migrations) {
        if (err) {
          return callback(err);
        }
        runMigrations(log, migrations, callback);
      });
    });
  },
  get: function(callback) {
    var migrationsDir = path.join(__dirname, 'migrations');
    fs.readdir(migrationsDir, function(err, files) {
      if (err) {
        return callback(err);
      }
      callback(null, files.filter(function(file) {
          return file.substr(-3) === '.js';
        })
        .map(function(file) {
          return require(path.join(migrationsDir, file));
        })
      );
    });
  }
};
