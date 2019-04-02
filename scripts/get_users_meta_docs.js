const inquirer = require('inquirer'),
      PouchDB = require('pouchdb'),
      fs = require('fs'),
      path = require('path');

if(process.argv[2] === '-h' || process.argv[2] === '--help') {
  console.log(`Display or save telemetry and feedback docs.

Usage:
    ${process.argv[1]} [medic users meta db URL]

Example:
    ${process.argv[1]} http://admin:pass@localhost:5984/medic-users-meta
`);
  process.exit(0);
}

const couchUrl = process.argv[2] || 'http://admin:pass@localhost:5984/medic-users-meta';

const db = PouchDB(couchUrl);

var type;
var docIndex = 0;
var docs;
var filePath;

const actionChoices = [
  'Display next', 
  'Display previous', 
  'Save current in working directory', 
  'Save all in working directory',
  'Quit'
];

const typeQuestions = [{
  type: 'list',
  name: 'docType',
  message: 'What type of docs do you want to review?',
  choices: ['feedback', 'telemetry']
}];

const actionQuestions = [{
  type: 'list',
  name: 'action',
  message: 'Do you want to?',
  choices: actionChoices
}];

const askActionQuestions = () => {
  inquirer.prompt(actionQuestions)
          .then(response => {
            const actionIndex = actionChoices.indexOf(response.action);
            switch (actionIndex) {
              case 0:
                docIndex++;
                console.log(docs[docIndex]);
                askActionQuestions();
                break;
              case 1:
                docIndex = Math.max(0, --docIndex);
                console.log(docs[docIndex]);
                askActionQuestions();
                break;
              case 2:
                filePath = path.join(path.resolve(__dirname), docs[docIndex]._id + '.json');
                fs.writeFileSync(filePath, JSON.stringify(docs[docIndex]));
                console.log(`Current document saved to ${filePath}`);
                askActionQuestions();
                break;
              case 3:
                filePath = path.join(path.resolve(__dirname), `${type}.json`);
                fs.writeFileSync(filePath, JSON.stringify(docs));
                console.log(`Documents saved to ${filePath}`);
                askActionQuestions();
                break;
              case 4:
                break;
              default:
                askActionQuestions();
            }
          });
};

inquirer.prompt(typeQuestions)
        .then(response => {
          type = response.docType;
          return db.allDocs({
                     include_docs: true,
                     startkey: `${type}-`,
                     endkey: `${type}-\ufff0`,
                   })
                   .then(function(data) {
                     docs = data.rows.map(row => row.doc);
                     console.log(docs[docIndex]);
                     askActionQuestions();
                   });
        });
