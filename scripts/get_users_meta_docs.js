#!/usr/bin/env node

const inquirer = require('inquirer');
const PouchDB = require('pouchdb-core');
const fs = require('fs');
const path = require('path');
const minimist = require('minimist');

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
    ${process.argv[1]} --mode interactive --type telemetry http://admin:pass@localhost:5984/medic-users-meta
`);
  process.exit(0);
}

const mode = argv.mode;
const type = argv.type;
const couchUrl = argv._[0] || 'http://admin:pass@localhost:5984/medic-users-meta';

const db = PouchDB(couchUrl);

const fetchNextDocs = async (startkey) => {
  const options = {
    include_docs: true,
    limit : 100,
    endkey: `${type}-\ufff0`,
  };
  if (startkey) {
    options.startkey = startkey;
    options.skip = 1;
  } else {
    options.startkey = `${type}-`;
  }
  const response = await db.allDocs(options);
  if (response && response.rows.length > 0) {
    const nextStartKey = response.rows[response.rows.length - 1].id;
    const docs = response.rows.map(row => row.doc);
    return { docs, nextStartKey };
  }
  return { docs: [] };
};

const actionChoices = [
  { name: 'Display next', value: 'next' },
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
      let startkey;
      for (let i = 0; ; i++) {
        const result = await fetchNextDocs(startkey);
        startkey = result.nextStartKey;
        const docs = result.docs;
        if (docs.length > 0) {
          if (i === 0) {
            console.log('[');
          }
          docs.forEach(doc => console.log(JSON.stringify(doc, null, 2) + ','));
        } else if (i === 0) {
          console.error('\x1b[31m%s\x1b[0m', `There are no documents of type ${type}`);
          break;
        } else {
          console.log('{}]');
          break;
        }
      }
    } else if (mode === 'interactive') {
      const result = await fetchNextDocs();
      let startkey = result.nextStartKey;
      let docs = result.docs;
      let docIndex = 0;

      if (docs.length === 0) {
        console.error('\x1b[31m%s\x1b[0m', `There are no documents of type ${type}`);
      } else {
        console.log(JSON.stringify(docs[docIndex], null, 2));

        let response;
        do {
          response = await inquirer.prompt(actionQuestions);

          let printMessage = false;
          if (response.action === 'next') {
            if (++docIndex > docs.length - 1) {
              const result = await fetchNextDocs(startkey);
              startkey = result.nextStartKey;
              const nextDocs = result.docs;
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
              console.error('\x1b[31m%s\x1b[0m', `No next document. This is the last one.`);
            }
          } else if (response.action === 'save_current') {
            const filePath = path.join(path.resolve(__dirname), docs[docIndex]._id + '.json');
            fs.writeFileSync(filePath, JSON.stringify(docs[docIndex], null, 2));
            console.log('\x1b[31m%s\x1b[0m', `Current document saved to ${filePath}`);
          } else if (response.action === 'save_all') {
            const filePath = path.join(path.resolve(__dirname), `${type}.json`);
            let startkey;
            for (let i = 0; ; i++) {
              const result = await fetchNextDocs(startkey);
              startkey = result.nextStartKey;
              docs = result.docs;
              if (docs.length > 0) {
                if (i === 0) {
                  fs.writeFileSync(filePath, '[');
                }
                docs.forEach(doc => fs.appendFileSync(filePath, JSON.stringify(doc, null, 2) + ','));
              } else {
                fs.appendFileSync(filePath, '{}]');
                break;
              }
            }
            console.log('\x1b[31m%s\x1b[0m', `Documents saved to ${filePath}`);
          }
        } while (response.action !== 'quit');
      }
    }
  } catch(err) {
    console.error(err);
  }
})();
