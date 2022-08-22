const fs = require('fs');
const path = require('path');
const //_ = require('underscore'),
  parseArgs = require('minimist');
const jsondiff = require('json-diff');

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));

const argv = parseArgs(process.argv);

const server = argv._[2] || argv.server || process.env.COUCH_URL;

//Example Usage
//node diff.js 'https://user:pass@medic-bhaktapur.com/medic'

if (!server || argv.h || argv.help) {
  console.log(`You need to provide a Medic CouchDB url with basic authentication 
             (usename and password. Check 1password`);
  console.log('  node diff.js http://localhost:5984/medic');
  console.log('  node diff.js --server=http://localhost:5984/medic');
  console.log('  COUCH_URL=http://localhost:5984/medic node diff.js');
  return;
}

console.log(`Generating diffs for conflicts on ${server}`);

const DB = new PouchDB(server);

const writeToFile = (path, content) => {
  const jsonContent = JSON.stringify(content, null, 3);
  fs.writeFileSync(path, jsonContent);
};

const createDirectoryIfValid = (conflictDirectoryPath) => {
  if (!fs.existsSync(conflictDirectoryPath)){
    try {
      fs.mkdirSync(conflictDirectoryPath);     
      return;
    } catch(err){
      console.error('Error when creating conflict folder', err);
    }   
  }
  if(!isDiectoryEmpty(conflictDirectoryPath)){
    console.error('Conflict Directory is not empty, exiting');
    process.exit();
  } 
};

const isDiectoryEmpty = (path) => {
  return fs.readdirSync(path).length === 0;
};

const getConflictDirectoryPath = (doc_id, mainConflictFilesDirectory) => {
  //id:target~2022-05~44a58753-50b6-593f-bb42-999a5ca3c18c~org.couchdb.user:bhaktapur_chn6
  //foldername: target~2022-05~44a58753-50b6-593f-bb42-999a5ca3c18c~org.couchdb.user
  //We are only taking the doc id of target before the colon to not have issues 
  //creating the folder. We could replace and use the full id but then it would make the
  //id corrupted and not directly searchable with a foldername copy paste in CouchDB
 
  let conflictDirectoryName = doc_id.id.includes('target') ? doc_id.id.split(':')[0] : doc_id.id;
  //The doc id that is used for foldername might have characters that cannot 
  // be used to create folders. Hence we are replacing illegeal characters with space. 
  // Reverse this process to search for doc in DB.
  conflictDirectoryName = conflictDirectoryName.replace(/[/\\?%*:|"<>]/g, ' ');
  const conflictDirectoryPath = path.join(mainConflictFilesDirectory, conflictDirectoryName);
  return conflictDirectoryPath;
};

DB.query('medic-conflicts/conflicts', {reduce:false})
  .then(conflicts => {
    console.log(`Found ${conflicts.rows.length} conflicts`);
    const mainConflictFilesDirectory = path.join(__dirname, 'doc-conflicts');
    let ps = Promise.resolve();
    createDirectoryIfValid(mainConflictFilesDirectory);    
    conflicts.rows.forEach(r => {
      ps = ps.then(() => {
        const docId = r.id;
        const conflictingRevs = r.key;
        return DB.get(docId, { open_revs: 'all' })
          .then(results => {
            // Get the main_doc. Maindoc is the doc that isn't in the conflict list
            const mainDoc = results.filter(r => !conflictingRevs.includes(r.ok._rev))[0].ok; 

            //Now we are going to write each doc, their conflicts and their diffs 
            //in one file for manual inspection if required.
            // Main goal  is to have folder name that contains substring of document ID
            //of document of couch db so that it is easily searchable with file name
            // copy and paste.
            const conflictDirectoryPath = getConflictDirectoryPath(r, mainConflictFilesDirectory); 
            createDirectoryIfValid(conflictDirectoryPath);

            writeToFile(path.join(conflictDirectoryPath, 'mainDocument.json'), mainDoc);
            r.key.forEach( conflictDocId => {
              const conflictDoc = results.find(r => r.ok._rev === conflictDocId).ok;
              //Generate Json Diff
              const jsonDiff = jsondiff.diff(mainDoc, conflictDoc);
              console.log(jsonDiff);

              //Write conflict doc to the drive
              writeToFile(path.join(conflictDirectoryPath, `${conflictDocId}.json`), conflictDoc);

              //Write JSON diff between the conflict files
              writeToFile(path.join(conflictDirectoryPath, `diff_${conflictDocId}.json`), jsonDiff);
            });
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
