/**
 * Run backwards compatible migrations.
 *
 * Usage:
 *   COUCH_URL=<url> node index <migration-names> [<skip>]
 *
 * Where:
 *  migration-names is a comma separated list of known migrations you wish to execute.
 *  skip is a number for how many docs to skip (defaults to 0).
 *
 * Example:
 *  COUCH_URL=http://admin:pass@localhost:5984/medic node index xml-attachments,read-status,linked-contacts 105
 *
 * @module manual-migrations
 */
const db = require('../db').medic;
const logger = require('../logger');

const PAGE_LIMIT = 100;
const ALL_MIGRATIONS = {
  // compatible with 2.10+
  'xml-attachments': require('./extract-data-record-content'),

  // compatible with 2.13+
  'read-status': require('./remove-read-status'),
  'linked-contacts': require('./minify-contacts'),
};
const [, , migrationNames, skip = 0] = process.argv;

if (!migrationNames) {
  throw new Error('No version supplied. Usage: "node index <migrations>".');
}

const migrations = migrationNames.split(',').map(name => {
  const migration = ALL_MIGRATIONS[name.trim()];
  if (!migration) {
    throw new Error(
      `Unknown migration name "${name}", available migrations: ${Object.keys(
        ALL_MIGRATIONS
      )}`
    );
  }
  return migration;
});

if (!migrations.length) {
  throw new Error(
    `No migrations found, available migrations: ${Object.keys(ALL_MIGRATIONS)}`
  );
}

const getPage = skip => {
  logger.info(`Getting 100 docs from ${skip}`);
  return db.allDocs({
    include_docs: true,
    limit: PAGE_LIMIT,
    skip: skip,
  });
};

const updateDocs = docs => {
  logger.info(
    `Executing ${migrations.length} migration(s) on ${docs.length} doc(s)`
  );
  return docs.filter(doc => migrations.some(migration => migration(doc)));
};

const saveUpdated = docs => {
  if (!docs.length) {
    return logger.info(`No docs in page required migration`);
  }
  logger.info(`Updating ${docs.length} doc(s)`);
  return db.bulkDocs(docs);
};

const run = skip => {
  getPage(skip)
    .then(results => {
      const docs = results.rows.map(row => row.doc);
      if (!docs.length) {
        logger.info('No more docs found - finished successfully');
        process.exit();
      }
      return docs;
    })
    .then(updateDocs)
    .then(saveUpdated)
    .then(() => {
      setTimeout(() => run(skip + PAGE_LIMIT));
    });
};

run(parseInt(skip));
