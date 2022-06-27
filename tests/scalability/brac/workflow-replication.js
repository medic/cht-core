const path = require('path');
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-adapter-leveldb'));

const [,, instanceUrl, dataDir, threadId] = process.argv;
const dataDirPath = path.resolve(dataDir || __dirname);
const users = require(path.resolve(dataDirPath, 'users.json'));
const config = require('./config');

const factoryPath = path.join(__dirname, '../../factories/brac');
const personFactory = require(path.join(factoryPath, 'contacts/brac-person'));
const surveyFactory = require(path.join(factoryPath, 'reports/brac-survey'));

const user = users[(threadId || 0) % users.length];
let clinics;
const dbUrl = `${instanceUrl}/medic`;

const remoteDb = new PouchDB(dbUrl, {
  skip_setup: true,
  ajax: { timeout: 30000 },
  auth: { username: user.username, password: user.password }
});

const localDb = new PouchDB(path.join(dataDirPath, `/dbs/scalability-test-${threadId}`), { adapter: 'leveldb' });

const replicateFrom = () => {
  return localDb.replicate
    .from(remoteDb, { live: false, retry: true, heartbeat: 10000 })
    .catch(err => {
      console.error('initial replication failed', err); // eslint-disable-line no-console
      process.exit(1);
    });
};

const replicateTo = () => {
  return localDb.replicate
    .to(remoteDb, { live: false, retry: true, heartbeat: 10000 })
    .catch(err => {
      console.error('initial replication failed', err); // eslint-disable-line no-console
      process.exit(1);
    });
};

const replicate = async () => {
  await replicateTo();
  await replicateFrom();
};

const getRandomParent = () => {
  const idx = Math.floor(Math.random() * clinics.length);
  return clinics[idx];
};

const generatePerson = (parent) => {
  const lineage = { _id: parent._id, parent: parent.parent };
  const person = personFactory.generateBracPerson(lineage, 'member_eligible_woman');
  return person;
};

const generateReports = (person, parent) => {
  const reports = [];
  if (personFactory.shouldGeneratePregnancySurvey(person)) {
    reports.push(surveyFactory.generateBracSurvey('pregnancy', parent, person));
  }

  if (personFactory.shouldGenerateAssessmentSurvey(person)) {
    reports.push(surveyFactory.generateBracSurvey('assesment', parent, person));
    reports.push(surveyFactory.generateBracSurvey('assesment_follow_up', parent, person));
  }

  return reports;
};

const getClinics = async () => {
  const contacts = await localDb.query(
    'medic-client/contacts_by_parent',
    { key: [user.place, 'clinic'], include_docs: true }
  );
  clinics = contacts.rows.map(row => row.doc);
};

const generateData = async () => {
  const docs = [];
  for (let i = 0; i < config.workflowContactsNbr.person; i++) {
    const parent = getRandomParent();
    const person = generatePerson(parent);
    const reports = generateReports(person, parent);
    docs.push(person, ...reports);
  }

  await localDb.bulkDocs(docs);
};

(async () => {
  try {
    await getClinics();
    for (let i = 0; i < config.workflowContactsNbr.iterations; i++) {
      await generateData();
      await replicate();
    }
  } catch (err) {
    console.error('Error while replicating workflow data', err);
    process.exit(1);
  }
})();
