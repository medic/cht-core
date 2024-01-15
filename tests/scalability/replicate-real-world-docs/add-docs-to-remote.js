const args = process.argv.slice(2);
const threadId = args[0];
const config = require('./config.json');
const user = config.users[threadId % config.users.length];

const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-adapter-http'));
const path = require('path');
const fs = require('fs');

const mainDataDirectory = config.data_directory;
const directoryPath = path.join(mainDataDirectory, user.contact);

const remoteDb = new PouchDB(config.url, {
  skip_setup: true,
  ajax: { timeout: 30000 },
  auth: { username: user.name, password: user.pass }
});

const addDocToRemote = async (filePath) => {
  const jsonString = await fs.promises.readFile(filePath, 'utf8');
  const jsonObject = JSON.parse(jsonString);
  await remoteDb.post(jsonObject);
};

const addDocs = async () => {
  const files = await fs.promises.readdir(directoryPath);
  await Promise.all(
    files.map(file => addDocToRemote(path.join(directoryPath, file)))
  );
};

addDocs().then(() => {
  console.log('Adding docs complete'); // eslint-disable-line no-console
  process.exit(0);
})
  .catch(err => {
    console.error('Adding docs failed', err); // eslint-disable-line no-console
    process.exit(1);
  });


