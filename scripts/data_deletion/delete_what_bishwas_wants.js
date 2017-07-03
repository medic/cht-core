/*jshint esversion: 6 */
'use strict';

var PouchDB = require('pouchdb');
const _ = require('underscore');

var dbUrl = process.env.COUCH_URL;
var db = new PouchDB(dbUrl);
var utils = require('./delete_training_data_utils.js');

var chwId = process.argv[2];
var form = process.argv[3];
var patientId = process.argv[4];
const startTimestamp = process.argv[5];

if (!chwId || !form || !patientId || !startTimestamp) {
  console.log('Usage:\nnode delete_what_bishwas_wants.js <chwId> ' +
    '<form code> <patientId> <startTimestamp>\n');
  console.log('startTimestamp is start of the time window. The end time is now. Unix timestamp in milliseconds since epoch.');
  console.log('\nExample :\nnode delete_what_bishwas_wants.js 0e64a0b4566ca8eede14f6fe1fca7970 ग 12345 1498600800000');
  process.exit();
}

const logdir = 'logs_' + new Date().getTime();
var logfile = 'deletion.log';
utils.setupLogging(logdir, logfile);

const dryrun = true;
if (!dryrun) {
  console.log('DELETING FORREALZ!!!');
}
console.log('chwId', chwId);
console.log('form', form);
console.log('patientId', patientId);
console.log('startTimestamp', startTimestamp);


const ids = reports => reports.map(report => report._id);

const getReportsToDelete = () => {
  return db.query(
    'medic-client/reports_by_subject',
    {
      startkey: [ patientId ],
      endkey: [ patientId, {} ],
      include_docs: true
    })
  .then(result => {
    var reports = result.rows.map(row => { return row.doc; });
    console.log('reports.length',reports.length);

    reports = reports.filter(
      report => report.contact && report.contact._id && report.contact._id === chwId);
    console.log('reportsFromChw.length', reports.length);

    reports = reports.filter(report => report.form === form);
    console.log('reportsFromChwByForm.length', reports.length);

    reports = reports.filter(report => report.reported_date > startTimestamp);
    console.log('reportsFromChwByFormSinceTimestamp.length', reports.length);

    reports = _.sortBy(reports, report => report.reported_date);
  //  console.log(JSON.stringify(ids(sorted), null, 2));

    // Remove the first one, we don't want to delete the original.
    reports.shift();
    return reports;
  });
};

const deleteBatch = (batch, index) => {
  console.log('batch index', index);
  return Promise.resolve(batch)
    .then(_.partial(utils.writeDocsToFile, logdir + '/reports_deleted_' + chwId + '_' + patientId + '_' + form + '_' + index + '.json'))
    .then(_.partial(utils.writeDocsIdsToFile, logdir + '/reports_deleted_' + chwId + '_' + patientId + '_' + form + '_' + index + '_ids.json'))
    .then(_.partial(utils.deleteDocs, dryrun, db))
    .then(function(result) {
      console.log(result.length + ' reports deleted!\n');
      return result;
    });
};

const BATCH_SIZE = 100;

getReportsToDelete()
  .then(reports => {
    const chain = Promise.resolve();
    let index = 0;
    while(index < reports.length) {
      let batch;
      if (index + BATCH_SIZE > reports.length) {
        batch = reports.slice(index, reports.length);
      } else {
        batch = reports.slice(index, index + BATCH_SIZE);
      }
      const i = index;
      chain.then(() => {
        return deleteBatch(batch, i);
      });
      index = index + BATCH_SIZE;
    }
    return chain;
  })
  .catch(console.log);
