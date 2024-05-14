const { promisify } = require('util');
const fs = require('fs');
const readdir = promisify(fs.readdir);
const path = require('path');
const db = require('./db');
const MIGRATION_LOG_ID = 'migration-log';
const MIGRATION_LOG_TYPE = 'meta';
const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const logger = require('@medic/logger');

const hasRun = (log, migration) => {
  if (!log || !log.migrations) {
    return false;
  }
  return log.migrations.indexOf(migration.name) !== -1;
};

const getLogWithView = () => {
  const options = {
    include_docs: true,
    key: [MIGRATION_LOG_TYPE],
  };
  return db.medic.query('medic-client/doc_by_type', options).then(result => {
    return result && result.rows && result.rows[0] && result.rows[0].doc;
  });
};

const deleteOldLog = oldLog => {
  if (oldLog) {
    oldLog._deleted = true;
    return db.medic.put(oldLog);
  }
};

const createMigrationLog = () => {
  return getLogWithView()
    .then(oldLog => {
      const newLog = {
        _id: MIGRATION_LOG_ID,
        type: MIGRATION_LOG_TYPE,
        migrations: (oldLog && oldLog.migrations) || [],
      };
      return db.medic.put(newLog).then(() => deleteOldLog(oldLog));
    })
    .then(() => getLog());
};

const getLog = () => {
  return db.medic.get(MIGRATION_LOG_ID).catch(err => {
    if (err.status === 404) {
      return createMigrationLog();
    }
    throw err;
  });
};

const sortMigrations = (lhs, rhs) => {
  return lhs.created - rhs.created;
};

const runMigration = migration => {
  if (!migration.created) {
    return Promise.reject(
      new Error(`Migration "${migration.name}" has no "created" date property`)
    );
  }
  logger.info(`Running migration ${migration.name}...`);
  return migration
    .run()
    .then(getLog)
    .then(log => {
      log.migrations.push(migration.name);
      return db.medic.put(log);
    });
};

const runMigrations = (log, migrations) => {
  migrations.sort(sortMigrations);
  let chain = Promise.resolve();
  migrations.forEach(migration => {
    if (!hasRun(log, migration)) {
      chain = chain.then(() => {
        return runMigration(migration)
          .then(() => {
            logger.info(`Migration ${migration.name} completed successfully`);
          })
          .catch(err => {
            logger.error(`Migration ${migration.name} failed`);
            return Promise.reject(err);
          });
      });
    }
  });
  return chain;
};

module.exports = {
  run: () => {
    return Promise.all([getLog(), module.exports.get()]).then(
      ([log, migrations]) => runMigrations(log, migrations)
    );
  },
  get: () => {
    return readdir(MIGRATIONS_DIR).then(files => {
      return files
        .filter(file => file.substr(-3) === '.js')
        .map(file => require(path.join(MIGRATIONS_DIR, file)));
    });
  },
};
