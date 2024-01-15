const _ = require('underscore');
const parseArgs = require('minimist');
const diff = require('just-diff').diff;

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const argv = parseArgs(process.argv);

const server = argv._[2] || argv.server || process.env.COUCH_URL;

// If you pass this then we'll save changes to documents even though we can't
// fully resolve all conflicts
// This could be incredibly dangerous because if there is a UUID collision
// the documents are completely different and you're corrupting things further
// TODO: support saving partials
// TODO: support detecting uuid conflicts
//       There should be some easy things we can check, like the type changing
//       Also the name changing, parents changing maybe
// const partials = argv['allow-partials'];
//

const verbose = argv.verbose;

if (!server || argv.h || argv.help) {
  console.log('You need to provide a Medic CouchDB url:');
  console.log('  node auto-resolve.js http://localhost:5984/medic');
  console.log('  node auto-resolve.js --server=http://localhost:5984/medic');
  console.log('  COUCH_URL=http://localhost:5984/medic node auto-resolve.js');
  console.log('Other options:');
  console.log('  --verbose');
  console.log('    outputs unresolved diffs');
  return;
}

console.log(`Loading and attempting to auto-resolve conflicts on ${server}`);

const DB = new PouchDB(server);

DB.query('medic-conflicts/conflicts')
  .then(conflicts => {
    console.log(`Found ${conflicts.rows.length} conflicts`);

    let ps = Promise.resolve();
    conflicts.rows.forEach(r => {
      ps = ps.then(() => {
        if (r.key.length !== 1) {
          console.log(`${r.id} has ${r.key.length} conflicts, we only want to deal with 1, skipping...`);
        } else {
          return resolveConflictLoop(r.id, r.key[0]);
        }
      });
    });
    return ps;
  })
  .catch(console.error);

const resolveConflictLoop = (docId, conflictRev) => DB
  .get(docId, { open_revs: 'all' })
  .then(results => {
    // Dealing with more than a simple two document diff is for another lifetime
    if (results.length !== 2) {
      console.error('This function should NOT be called with more than two open revs');
      process.exit(1);
    }

    // Make sure mine and theirs are the right way around
    const mine = results.find(r => r.ok._rev !== conflictRev).ok;
    const theirs = results.find(r => r.ok._rev === conflictRev).ok;

    const [resolvedCount, unresolvedConflicts] = resolve(mine, theirs);

    if (verbose) {
      console.log('\n====');
      console.log(docId);
      console.log(unresolvedConflicts);
    }

    if (unresolvedConflicts.length === 0) {
      console.log(`${verbose ? '' : docId} resolved ${resolvedCount} issues, merging`);
      theirs._deleted = true;
      return DB.bulkDocs([mine, theirs])
        .then(results => {
          console.log('Merged', results);
        });
    }
    console.log(`${verbose ? '' : docId} managed to resolve ${resolvedCount} conflicts, ` +
                `${unresolvedConflicts.length} remain, skipping...`);
  });

// Work through all differences and attempt to resolve them.
// Can modify mine
// Returns a tuple of how many issues were resolved, and all unresolved
const resolve = (mine, theirs) => {
  let resolvedCount = 0;
  const unresolvedConflicts = diff(mine, theirs).filter(conflict => {
    // Situation 1 :: revs are different
    if (conflict.op === 'replace' && _.isEqual(conflict.path, ['_rev'])) {
      // Nothing to do here, just ignore it
      resolvedCount += 1;
      return false;
    }

    // TODO: read status, more!?!?!?!
    return true;
  });

  return [resolvedCount, unresolvedConflicts];
};
