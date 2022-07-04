const fs = require('fs');
const //_ = require('underscore'),
  parseArgs = require('minimist');
const jsondiff = require('json-diff');

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const argv = parseArgs(process.argv);

const server = argv._[2] || argv.server || process.env.COUCH_URL;

// Example
//server = 'https://user:pass@medic-bhaktapur.com/medic'


if (!server || argv.h || argv.help) {
  console.log(`You need to provide a Medic CouchDB url with baisc authentication 
             (usename and password. Check 1password`);
  console.log('  node diff.js http://localhost:5984/medic');
  console.log('  node diff.js --server=http://localhost:5984/medic');
  console.log('  COUCH_URL=http://localhost:5984/medic node diff.js');
  return;
}

console.log(`Generating diffs for conflicts on ${server}`);


const DB = new PouchDB(server);


const writeToFile = function(path, content) {
  const writeStream = fs.createWriteStream(path);
  writeStream.write(JSON.stringify(content, null, 3));
  writeStream.close();
};

DB.query('medic-conflicts/conflicts', {reduce:false})
  .then(conflicts => {
    console.log(`Found ${conflicts.rows.length} conflicts`);

    const mainConflictFilesDirectory = './doc-conflicts';
    let ps = Promise.resolve();
    if (!fs.existsSync(mainConflictFilesDirectory)){
      try {
        fs.mkdirSync(mainConflictFilesDirectory);
      }catch(err){
        console.log(`Error while creating main conflict folder: ${err}`);
      }
    }
    conflicts.rows.forEach(r => {
      ps = ps.then(() => {
        const docId = r.id;
        const arrayRevsIdThatShouldNotBeThere = r.key;
        return DB.get(docId, { open_revs: 'all' })
          .then(results => {

            // Get the main_doc. Maindoc is the doc that isn't in the conflict list
            const main_doc = results.filter(r => !arrayRevsIdThatShouldNotBeThere.includes(r.ok._rev))[0].ok; 

            //Now we are going to put each doc, its conflicts and thier diff 
            //in one file for manual inspection if required.
            //The doc id might have characters that cannot be used to create folders.
            let conflictDirectoryName = r.id;
            if(r.id.includes('target')){
              conflictDirectoryName = 'target_' + r.id.split(':')[0];
            } else if (r.id.includes('task')){ //If doc is task add ask and part of doc id
              conflictDirectoryName = 'task_' + r.id.split(':')[1];
            } else {  // if it is just a contact doc use the doct Id to create folder
              conflictDirectoryName = r.id;
            }
            
            conflictDirectoryName.replace(/[^0-9a-z]/gi, '');
            const conflictDirectoryPath = `${mainConflictFilesDirectory}/${conflictDirectoryName}`; 
            if (!fs.existsSync(conflictDirectoryPath)){
              try {
                fs.mkdirSync(conflictDirectoryPath);
              } catch(err){
                console.log(err);
              }
            }

            writeToFile(conflictDirectoryPath + '/' + 'mainDocument.json', main_doc);
            r.key.forEach( conflict_doc_id => {
              const conflict_doc = results.find(r => r.ok._rev === conflict_doc_id).ok;
              //Generate Json Diff
              const jsonDiff = jsondiff.diff(main_doc, conflict_doc);
              //Generate String Diff
              const stringJsonDiff = jsondiff.diffString(main_doc, conflict_doc);
              console.log(stringJsonDiff);

              //Write JSON diff between the conflict files
              writeToFile(conflictDirectoryPath +'/diff_' +conflict_doc_id +'.json', jsonDiff);

              //Write conflict doc to the drive
              writeToFile(conflictDirectoryPath +'/'+ conflict_doc_id + '.json', conflict_doc);

              //Write string diff between the conflict files
              writeToFile(conflictDirectoryPath + '/string_diff_' + conflict_doc_id + '.txt', stringJsonDiff);
            }
            );

            console.log('=====================');             
            console.log('=====================');

            console.log('\n\n');
          });            
      });
    });
    return ps;
  })
  .catch(err => {
    console.log(err);
  });
