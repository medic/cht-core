const fs = require('fs')
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
  console.log('You need to provide a Medic CouchDB url with baisc authentication (usename and password. Check 1password');
  console.log('  node diff.js http://localhost:5984/medic');
  console.log('  node diff.js --server=http://localhost:5984/medic');
  console.log('  COUCH_URL=http://localhost:5984/medic node diff.js');
  return;
}

console.log(`Generating diffs for conflicts on ${server}`);


const DB = new PouchDB(server);

let mainConflictFilesDirectory = "./doc-conflicts"


DB.query('medic-conflicts/conflicts', {reduce:false})
  .then(conflicts => {
    console.log(`Found ${conflicts.rows.length} conflicts`);

let mainConflictFilesDirectory = "./doc-conflicts"
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
        const conflictRev = r.key[0];
        arrayRevsIdThatShouldNotBeThere = r.key;
        return DB.get(docId, { open_revs: 'all' })
          .then(results => {

            // Get the main_doc. Maindoc is the doc that isn't in the conflict list
            //const main_doc = results.find(r => r.ok._rev !== arrayRevsIdThatShouldNotBeThere).ok;
            const main_doc = results.filter(r=>!arrayRevsIdThatShouldNotBeThere.includes(r.ok._rev))[0].ok 

            //Now we are going to put each doc, its conflicts and thier diff in one file for manual inspection if required.
            //The doc id might have characters that cannot be used to create folders.
            if(r.id.includes('target')){
              conflictDirectoryName = "target_" + r.id.split(":")[0]
            } //If doc is task add ask and part of doc id
            else if (r.id.includes('task')){
              conflictDirectoryName = "task_" + r.id.split(":")[1]
            } // if it is just a contact doc use the doct Id to create folder
            else {
              conflictDirectoryName = r.id
            }
            
            conflictDirectoryName.replace(/[^0-9a-z]/gi, '')
            let conflictDirectoryPath = `${mainConflictFilesDirectory}/${conflictDirectoryName}` 
            if (!fs.existsSync(conflictDirectoryPath)){
              try {
                fs.mkdirSync(conflictDirectoryPath);
              }
              catch(err){
                  console.log(err);
              }
            }
            var writeStream = fs.createWriteStream(conflictDirectoryPath + '/' + 'mainDocument.json');
            writeStream.write(JSON.stringify(main_doc,null,3))
            writeStream.close()
            r.key.forEach ( conflict_doc_id => {
                let conflict_doc = results.find(r => r.ok._rev === conflict_doc_id).ok;
                //Generate Json Diff
                jsonDiff = jsondiff.diff(main_doc, conflict_doc);
                //Generate String Diff
                stringJsonDiff = jsondiff.diffString(main_doc, conflict_doc)
                console.log(stringJsonDiff);
                var writeStream = fs.createWriteStream(conflictDirectoryPath + '/diff_' +conflict_doc_id + '.json');
                writeStream.write(JSON.stringify(jsonDiff,null,3))
                  
                var writeStream = fs.createWriteStream(conflictDirectoryPath + '/' + conflict_doc_id + '.json');
                writeStream.write(JSON.stringify(conflict_doc,null,3))
                writeStream.close()

                var writeStream = fs.createWriteStream(conflictDirectoryPath + '/string_diff_' + conflict_doc_id + '.txt','utf16le');
                writeStream.write(stringJsonDiff)
                writeStream.close()
              }
            )

            console.log('=====================');             
            console.log('=====================');

            console.log('\n\n');
          })            
      });
    });
    return ps;
  })
  .catch(err => {
    console.log(err);
  })
