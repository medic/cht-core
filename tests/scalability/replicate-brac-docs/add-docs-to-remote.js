const args = process.argv.slice(2);
const threadId = args[0];
const dataDirectory = args[1];
const config = require('./config.json');

const dataConfig = require('../generate_brac_data/data-config.json');
const user = config.users[threadId % config.users.length];

const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-adapter-http'));
const path = require('path');
const fs = require('fs');

const mainDataDirectory = dataConfig.main_script_data_directory;
const directoryPath = path.join(dataDirectory, mainDataDirectory, user.contact);

const remoteDb = new PouchDB(config.url, {
  skip_setup: true,
  ajax: { timeout: 30000 },
  auth: { username: user.name, password: user.pass }
});

const addDocToRemote = async (filePath) => {
  try {
    const jsonString = await fs.promises.readFile(filePath, 'utf8');
    const jsonObject = JSON.parse(jsonString);
    await remoteDb.post(jsonObject);
  } catch (err) {
    console.error('addDocToLocal error ');
    console.error(err);
    throw err;
  }
};

const addDocs = async () => {
  try {
    const files = await fs.promises.readdir(directoryPath);
    await Promise.all(
      files.map(file => addDocToRemote(path.join(directoryPath, file)))
    );
  } catch (err) {
    console.error('addDocs ');
    console.error(err);
    throw err;
  }
};

addDocs();
