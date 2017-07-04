/*jshint esversion: 6 */
'use strict';

const PouchDB = require('pouchdb');
const _ = require('underscore');

const dbUrl = process.env.COUCH_URL;
const db = new PouchDB(dbUrl);
const utils = require('./delete_training_data_utils.js');

const logdir = 'logs_' + new Date().getTime();
var logfile = 'deletion.log';
utils.setupLogging(logdir, logfile);

const dryrun = true; // change to false to delete forreal
const BATCH_SIZE = 2;

var idsFile = process.argv[2];
if (!idsFile) {
  console.log('No ids file. Usage:');
  console.log('node delete_by_ids.js myIdsFile.json');
  process.exit();
}
console.log('Reading from idsFile', idsFile);

if (!dryrun) {
  console.log('DELETING FORREALZ!!!');
} else {
  console.log('Dryrun, not deleting.');
}


const getAndDelete = (ids, index) => {
  return utils.getDocs(db, ids)
    .then(_.partial(utils.deleteDocsWithLog,
      dryrun,
      db,
      _,
      logdir + '/reports_deleted_' + index + '.json',
      logdir + '/reports_deleted_' + index + '_ids.json'));
};

utils.getJsonFromFile(idsFile)
  .then(ids => {
    const chain = Promise.resolve();
    let index = 0;
    while(index < ids.length) {
      let batch;
      if (index + BATCH_SIZE > ids.length) {
        batch = ids.slice(index, ids.length);
      } else {
        batch = ids.slice(index, index + BATCH_SIZE);
      }
      console.log('index', index, batch);
      const i = index;
      chain.then(() => {
        return getAndDelete(batch, i);
      });
      index = index + BATCH_SIZE;
    }
    return chain;
  })
//  .then(console.log)
  .catch(console.log);
