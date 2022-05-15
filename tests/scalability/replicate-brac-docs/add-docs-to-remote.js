const args = process.argv.slice(2);
const threadId = args[0];
const dataDirectory = args[1];
const config = require('./config.json');

const dataConfig = require('../generate_brac_data/data-config.json');
const user = config.users[threadId % config.users.length];

const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-adapter-memory'));
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
    let buffer = await fs.promises.readFile(filePath);
    let jsonString = buffer.toString('utf8');
    let jsonObject = JSON.parse(jsonString);
    let response = await remoteDb.post(jsonObject);
    console.log(response);
  } catch (err) {
    console.error('addDocToLocal error ');
    console.error(err);
    throw err;
  }
}

const addDocs = async () => {
  try {
    const files = await fs.promises.readdir(directoryPath);
    files.forEach(async (file) => await addDocToRemote(path.join(directoryPath, file)));
  } catch (err) {
    console.error('addDocs ');
    console.error(err);
    throw err;
  }
}

addDocs();
