/**
 * Description and usage : see usage message below.
 *
 * Delete reports within given dates, but not pregnancies.
 */

'use strict';

var PouchDB = require('pouchdb');
var _ = require('underscore');
var utils = require('./delete_training_data_utils.js');

var countFormTypes = function(reports) {
  var formInstances = {};
  _.each(reports, function(report) {
    if(!formInstances[report.form]) {
      formInstances[report.form] = 0;
    }
    formInstances[report.form] = formInstances[report.form] + 1;
  });
  console.log(formInstances);
  return reports;
};

var filterOutPregnancyReports = function(reports) {
  var notPregnancies = _.filter(reports, function(report) {
    return report.form !== 'pregnancy';
  });
  console.log('Filtered to remove pregnancy registrations : ' + notPregnancies.length);
  return notPregnancies;
};

var deleteReports = function(db, dryrun, branchId, startTimestamp, endTimestamp, logdir, batchSize) {
  return Promise.resolve()
    .then(function() {
      console.log('Deleting reports');
      return;
    })
    .then(_.partial(utils.getDataRecordsForBranch, db, branchId, batchSize))
    .then(_.partial(utils.filterByDate, _, startTimestamp, endTimestamp))
    .then(_.partial(countFormTypes, _))
    .then(_.partial(filterOutPregnancyReports, _))
    .then(_.partial(utils.writeDocsToFile, logdir + '/reports_deleted.json'))
    .then(_.partial(utils.deleteDocs, dryrun, db))
    .then(_.partial(utils.printoutDbStats, db))
    .then(function(result) {
      console.log(result.length + ' reports deleted!\n');
      return;
    });
};

// --------

if (process.argv.length < 6) {
  console.log('Not enough arguments.\n');
  console.log('Usage:\nnode delete_reports_not_pregnancies.js <branchId> ' +
    '<startTime> <endTime> <logdir> [dryrun]\n');
  console.log('Will use DB URL+credentials from $COUCH_URL.');
  console.log('Deletes all \'data_record\' data (except pregnancy reports)' +
    'from a given branch (\'district_hospital\' type) that was created ' +
    'between the two timestamps.');
  console.log('The deleted docs will be written out to json files in the ' +
    'logdir.');
  console.log('The dryrun arg will run the whole process, including writing the files, without actually doing the deletions.\n');
  console.log('Example:\nexport COUCH_URL=\'http://admin:pass@localhost:5984/medic\'; node delete_reports_not_pregnancies.js 52857bf2cef066525b2feb82805fb373 "2016-04-11 07:00 GMT+3:00" "2016-04-25 17:00 GMT+3:00" ./training_data_20160425 dryrun');
  process.exit();
}

var now = new Date();
var dbUrl = process.env.COUCH_URL;
var branchId = process.argv[2];
var start = new Date(process.argv[3]);
var end = new Date(process.argv[4]);
var logdir = process.argv[5] + '/' + now.getTime();
var dryrun = process.argv[6];
dryrun = (dryrun === 'dryrun');
var batchSize = 20000000;

var logfile = 'debug.log';
utils.setupLogging(logdir, logfile);

console.log('Now is ' + now.toUTCString() + '   (' + now + ')   (' + now.getTime() + ')');

var db = new PouchDB(dbUrl);
var startTimestamp = start.getTime();
var endTimestamp = end.getTime();

utils.fetchBranchInfo(db, branchId)
  .then(function(branchInfo) {
    var message = '\nStarting deletion process with\ndbUrl = $COUCH_URL' +
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

