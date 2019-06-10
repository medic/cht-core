const inquirer = require('inquirer'),
      PouchDB = require('pouchdb-core'),
      fs = require('fs'),
      path = require('path'),
      minimist = require('minimist');

PouchDB.plugin(require('pouchdb-adapter-http'));

const argv = minimist(process.argv.slice(2), {
  alias: {
    'h': 'help'
  }
});

if(argv.h || !argv.mode || !argv.type) {
  console.log(`Display or save telemetry and feedback docs.

Usage:
    ${process.argv[1]} -h | --help
    ${process.argv[1]} --mode (interactive | batch) --type (telemetry | feedback) [medic users meta db URL]

Options:
    -h --help     Show this screen.
    --mode        Interactive or Batch mode (Output docs to stdout)
    --type        Meta document type to fetch. 

Example:
    ${process.argv[1]} --interactive --type telemetry http://admin:pass@localhost:5984/medic-users-meta
`);
  process.exit(0);
}

const mode = argv.mode;
const type = argv.type;
const couchUrl = argv['_'][0] || 'http://admin:pass@localhost:5984/medic-users-meta';

const db = PouchDB(couchUrl);

let docIndex = 0;
let docs;

const actionChoices = [
  { name: 'Display next', value: 'next' }, 
  { name: 'Display previous', value: 'previous' }, 
  { name: 'Save current in working directory', value: 'save_current' }, 
  { name: 'Save all in working directory', value: 'save_all' },
  { name: 'Quit', value: 'quit' }
];

const actionQuestions = [{
  type: 'list',
  name: 'action',
  message: 'Do you want to?',
  choices: actionChoices
}];

(async function() {

  try {
    const data = await db.allDocs({
     include_docs: true,
     startkey: `${type}-`,
     endkey: `${type}-\ufff0`,
    });
    
    docs = data.rows.map(row => row.doc);

    if (mode === 'batch') {
      console.log(JSON.stringify(docs, null, 2));
    } else if (mode === 'interactive') {
     console.log(JSON.stringify(docs[docIndex], null, 2));
     for (;;) {
      const response = await inquirer.prompt(actionQuestions);
      if (response.action === 'next') {
        docIndex = Math.min(docs.length - 1, ++docIndex);
        console.log(JSON.stringify(docs[docIndex], null, 2));
      } else if (response.action === 'previous') {
        docIndex = Math.max(0, --docIndex);
        console.log(JSON.stringify(docs[docIndex], null, 2));
      } else if (response.action === 'save_current') {
        let filePath = path.join(path.resolve(__dirname), docs[docIndex]._id + '.json');
        fs.writeFileSync(filePath, JSON.stringify(docs[docIndex], null, 2));
        console.log(`Current document saved to ${filePath}`);
      } else if (response.action === 'save_all') {
        let filePath = path.join(path.resolve(__dirname), `${type}.json`);
        fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
        console.log(`Documents saved to ${filePath}`);
      } else if (response.action === 'quit') {  
        break;
      }  
     }
    }
  } catch(err) {
    console.log(err);
  }
})();
