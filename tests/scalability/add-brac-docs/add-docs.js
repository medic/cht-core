const args = process.argv.slice(2);
const medicInstance = args[1];

const config = require('./config.json');
const dataConfig = require('../generate_brac_data/data-config.json');
const mainDataDirectory = dataConfig.main_script_data_directory;

const user = config.users[threadId % config.users.length];

const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-adapter-memory'));

const remoteDb = new PouchDB(medicInstance, {
  skip_setup: true,
  ajax: { timeout: 30000 },
  auth: { username: user.name, password: user.pass }
});

const addDocs = () => {
  return remoteDb.post({
    title: 'Ziggy Stardust'
  });
};

addDocs()
  .then(() => {
    console.log('Adding documents complete'); // eslint-disable-line no-console
    process.exit(0);
  })
  .catch(err => {
    console.error('Adding documents failed', err); // eslint-disable-line no-console
    process.exit(1);
  });
