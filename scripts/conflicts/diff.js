const //_ = require('underscore'),
  parseArgs = require('minimist');
const jsondiff = require('json-diff');

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const argv = parseArgs(process.argv);

const server = argv._[2] || argv.server || process.env.COUCH_URL;

if (!server || argv.h || argv.help) {
  console.log('You need to provide a Medic CouchDB url:');
  console.log('  node diff.js http://localhost:5984/medic');
  console.log('  node diff.js --server=http://localhost:5984/medic');
  console.log('  COUCH_URL=http://localhost:5984/medic node diff.js');
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
        // console.log(r);
        if (r.key.length !== 1) {
          console.log(`${r.id} has ${r.key.length} conflicts, we only want to deal with 1, skipping...`);
        } else {
          const docId = r.id;
          const conflictRev = r.key[0];
          return DB.get(docId, { open_revs: 'all' })
            .then(results => {
              // console.log(results);
              // Make sure mine and theirs are the right way around
              const mine = results.find(r => r.ok._rev !== conflictRev).ok;
              const theirs = results.find(r => r.ok._rev === conflictRev).ok;

              console.log('=====================');
              console.log(r.id);
              console.log('=====================');
              console.log(jsondiff.diffString(mine, theirs));
              console.log('\n\n');
            });
        }
      });
    });
    return ps;
  })
  .catch(console.error);
