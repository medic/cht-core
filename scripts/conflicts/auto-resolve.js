const parseArgs = require('minimist'),
      diff = require('just-diff').diff;

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const argv = parseArgs(process.argv);

const server = argv._[2] || argv.server || process.env.COUCH_URL;

// If you pass this then we'll save changes to documents even though we can't
// fully resolve all conflicts
// TODO: this
// const partials = argv['allow-partials'];

if (!server || argv.h || argv.help) {
  console.log('You need to provide a Medic CouchDB url:');
  console.log('  node auto-resolve.js http://localhost:5984/medic');
  console.log('  node auto-resolve.js --server=http://localhost:5984/medic');
  console.log('  COUCH_URL=http://localhost:5984/medic node auto-resolve.js');
  return;
}

console.log(`Generating diffs for conflicts on ${server}`);

const DB = new PouchDB(server);

DB.query('medic-conflicts/conflicts')
  .then(conflicts => {
    console.log(`Found ${conflicts.rows.length} conflicts`);

    let ps = Promise.resolve();
    conflicts.rows.forEach(r => {
      ps = ps.then(() => {
        if (r.key.length !== 1) {
          console.log(`${r.id} as ${r.key.length} conflicts, we only want to deal with 1, skipping...`);
        } else {
          console.log(r.id);
          return resolveConflictLoop(r);
        }
      });
    });
    return ps;
  })
  .catch(console.error);


const resolveConflictLoop = conflict => DB
  .get(conflict.id, { open_revs: 'all' })
  .then(([{ok: mine}, {ok: theirs}, ...rest]) => {
    // Dealing with more than a simple two document diff is for another lifetime
    if (rest.length) {
      console.error('This function should NOT be called with more than two open revs');
      process.exit(1);
    }

    const [resolvedCount, unresolvedConflicts] = resolve(mine, theirs);

    if (unresolvedConflicts.length === 0) {
      console.log(`Resolved ${resolvedCount} issues, merging`);
      theirs._deleted = true;
      // return DB.bulkDocs([mine, theirs])
      //   .then(results => {
      //     console.log('Merged', results);
      //   });
    } else {
      console.log(`Managed to resolve ${resolvedCount} conflicts, ${unresolvedConflicts.length} remain, skipping...`);
    }
  });

// Work through all differences and attempt to resolve them.
// Can modify mine
// Returns a tuple of how many issues were resolved, and all unresolved
const resolve = (mine, theirs) => {
  let resolvedCount = 0;
  const unresolvedConflicts = diff(mine, theirs).map(conflict => {
    // Situation 1 :: revs are different
    if (conflict.op === 'replace' && conflict.path === '_rev') {
      // Nothing to do here, just ignore it
      resolvedCount += 1;
      return false;
    }

    // TODO: read status, more!?!?!?!
  });

  return [resolvedCount, unresolvedConflicts];
};
