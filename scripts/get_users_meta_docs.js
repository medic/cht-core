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

var nextOptions = { 
  include_docs: true,
  limit : 100,
  startkey: `${type}-`,
  endkey: `${type}-\ufff0`,
};

var prevOptions = { 
  include_docs: true,
  limit : 100,
  startkey: `${type}-`,
  endkey: `${type}-\ufff0`,
};

var prevStartKeys = [];

const fetchNextDocs = async () => {
  const response = await db.allDocs(nextOptions);
  if (response && response.rows.length > 0) {
    prevStartKeys.push(nextOptions.startkey);
    nextOptions.startkey = response.rows[response.rows.length - 1].id;
    nextOptions.skip = 1;

    return response.rows.map(row => row.doc);
  }
  return [];
};

const fetchPrevDocs = async () => {
  if (prevStartKeys.length === 0) {
    return [];
  }
  const startkey = prevStartKeys.pop();
  if (prevOptions.startkey === startkey) {
    return [];
  }
  prevOptions.startkey = startkey;
  const response = await db.allDocs(prevOptions);
  if (response && response.rows.length > 0) {
    prevOptions.startkey = response.rows[response.rows.length - 1].id;
    nextOptions.skip = 1;

    return response.rows.map(row => row.doc);
  }
  return [];
};


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
    if (mode === 'batch') {
      for (let i = 0;; i++) {
        docs = await fetchNextDocs();
        if (docs.length > 0) {
          if (i === 0) {
            console.log('[');
          }
          docs.forEach(doc => console.log(JSON.stringify(doc, null, 2) + ','));
        } else if (i === 0) {
          console.log('\x1b[31m%s\x1b[0m', `There are no documents of type ${type}`);
          break;
        } else {
          console.log('{}]');
          break;
        }
      }
    } else if (mode === 'interactive') {
      docs = await fetchNextDocs();
      if (docs.length === 0) {
        console.log('\x1b[31m%s\x1b[0m', `There are no documents of type ${type}`);
      } else {
        console.log(JSON.stringify(docs[docIndex], null, 2));
        for (;;) {
          const response = await inquirer.prompt(actionQuestions);

          var printMessage = false;
          if (response.action === 'next') {
            if (++docIndex > docs.length - 1) {
              const nextDocs = await fetchNextDocs();
              if (nextDocs.length === 0) {
                printMessage = true;
                docIndex = docs.length - 1;
              } else {
                docs = nextDocs;
                docIndex = 0;
              }
            }

            console.log(JSON.stringify(docs[docIndex], null, 2));
            if (printMessage) {
              console.log('\x1b[31m%s\x1b[0m', `No next document. This is the last one.`);
            }
          } else if (response.action === 'previous') {
            if (--docIndex < 0) {
              const prevDocs = await fetchPrevDocs();
              if (prevDocs.length === 0) {
                printMessage = true;
                docIndex = 0;
              } else {
                docs = prevDocs;
                docIndex = docs.length - 1;
              }
            }

            console.log(JSON.stringify(docs[docIndex], null, 2));
            if (printMessage) {
              console.log('\x1b[31m%s\x1b[0m', `No previous document. This is the first one`);
            }
          } else if (response.action === 'save_current') {
            let filePath = path.join(path.resolve(__dirname), docs[docIndex]._id + '.json');
            fs.writeFileSync(filePath, JSON.stringify(docs[docIndex], null, 2));
            console.log('\x1b[31m%s\x1b[0m', `Current document saved to ${filePath}`);
          } else if (response.action === 'save_all') {
            let filePath = path.join(path.resolve(__dirname), `${type}.json`);
            fs.writeFileSync(filePath, JSON.stringify(docs, null, 2));
            console.log('\x1b[31m%s\x1b[0m', `Documents saved to ${filePath}`);
          } else if (response.action === 'quit') {  
            break;
          }  
        }
      }
    }
  } catch(err) {
    console.log(err);
  }
})();
