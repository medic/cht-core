/**
 * Description and usage : see usage message below.
 *
 * Delete reports within given dates, but not pregnancies.
 */

'use strict';

const PouchDB = require('pouchdb');
const _ = require('underscore');
const url = require('url');
const utils = require('./delete_training_data_utils.js');

const countFormTypes = function(reports) {
  const formInstances = {};
  _.each(reports, function(report) {
    if(!formInstances[report.form]) {
      formInstances[report.form] = 0;
    }
    formInstances[report.form] = formInstances[report.form] + 1;
  });
  console.log(formInstances);
  return reports;
};

const filterOutPregnancyReports = function(reports) {
  const notPregnancies = _.filter(reports, function(report) {
    return report.form !== 'pregnancy';
  });
  console.log('Filtered to remove pregnancy registrations : ' + notPregnancies.length);
  return notPregnancies;
};

const deleteReports = function(db, dryrun, branchId, startTimestamp, endTimestamp, logdir, batchSize) {
  return utils.queryInBatches(
    function(skip) {
      console.log('Deleting reports');
      return utils.getDataRecordsForBranch(db, branchId, skip, batchSize);
    },
    function(docs, skip) {
      return Promise.resolve()
        .then(_.partial(utils.filterByDate, docs, startTimestamp, endTimestamp))
        .then(_.partial(countFormTypes, _))
        .then(_.partial(filterOutPregnancyReports, _))
        .then(_.partial(utils.writeDocsToFile, logdir + '/reports_deleted_' + skip + '.json'))
        .then(_.partial(utils.writeDocsIdsToFile, logdir + '/reports_deleted_ids.json'))
        .then(_.partial(utils.deleteDocs, dryrun, db))
        .then(function(result) {
          console.log(result.length + ' reports deleted!\n');
          return result;
        });
    });
};

// --------

if (process.argv.length < 6) {
  console.log('Not enough arguments.\n');
  console.log('Usage:\nnode delete_reports_not_pregnancies.js <branchId> ' +
    '<startTime> <endTime> <logdir> <batchsize> [dryrun]\n');
  console.log('Will use DB URL+credentials from $COUCH_URL.');
  console.log('Deletes all \'data_record\' data (except pregnancy reports)' +
    'from a given branch (\'district_hospital\' type) that was created ' +
    'between the two timestamps.');
  console.log('The deleted docs will be written out to json files in the ' +
    'logdir.');
  console.log('The dryrun arg will run the whole process, including writing the files, without actually doing the ' +
    'deletions.\n');
  console.log('Example:\nexport COUCH_URL=\'http://admin:pass@localhost:5984/medic\'; ' +
    'node delete_reports_not_pregnancies.js 52857bf2cef066525b2feb82805fb373 "2016-04-11 07:00 GMT+3:00" ' +
    '"2016-04-25 17:00 GMT+3:00" ./training_data_20160425 100 dryrun');
  process.exit();
}

const now = new Date();
const dbUrl = process.env.COUCH_URL;
const branchId = process.argv[2];
const start = new Date(process.argv[3]);
const end = new Date(process.argv[4]);
const logdir = process.argv[5] + '/' + now.getTime();
const batchSize = parseInt(process.argv[6]);
let dryrun = process.argv[7];
dryrun = (dryrun === 'dryrun');

const logfile = 'debug.log';
utils.setupLogging(logdir, logfile);

console.log('Now is ' + now.toUTCString() + '   (' + now + ')   (' + now.getTime() + ')');

const db = new PouchDB(dbUrl);
const startTimestamp = start.getTime();
const endTimestamp = end.getTime();
const parsedUrl = url.parse(dbUrl);

utils.fetchBranchInfo(db, branchId)
  .then(function(branchInfo) {
    const message = '\nStarting deletion process with' +
      '\ndbUrl = ' + parsedUrl.host + parsedUrl.pathname +
      '\nbranch = ' + JSON.stringify(branchInfo) +
      '\nstartTimeMillis = ' + start.toUTCString() + ' (' + start.getTime() +
      ')\nendTimeMillis = ' + end.toUTCString() + ' (' + end.getTime() + ')\nlogdir = ' + logdir +
      '\nbatchSize = ' + batchSize +
      '\ndryrun = ' + dryrun + '\n';
    return utils.userConfirm(message);
  })
  .then(_.partial(deleteReports, db, dryrun, branchId, startTimestamp, endTimestamp, logdir, batchSize))
  .catch(function (err) {
    console.log('Error!!!');
    console.log(err);
  });

