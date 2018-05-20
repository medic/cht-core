const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
const server = process.env.COUCH_URL || 'http://admin:pass@localhost:5984/medic';
const DB = new PouchDB(server);

DB.get('_design/medic')
  .then(ddoc => {
    return DB
      .put({
        _id: 'settings',
        settings: ddoc.app_settings
      })
      .then(() => {
        delete ddoc.app_settings;
        return DB.put(ddoc);
      });
  })
  .then(() => {
    console.log('settings doc saved - welcome to the future');
  })
  .catch(err => {
    console.error(err);
  });
