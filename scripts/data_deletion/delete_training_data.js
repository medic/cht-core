/**
 * Description and usage : see usage message below.
 *
 * Postmortem (2016-04-25) : editing/deleting data triggers reindexing, that
 * slows down couch, so you are likely to get `[Error: ETIMEDOUT] status: 400`
 * halfway through the script. You can either wait for indexing to be done
 * (couch logs will say `Index update finished for db: medic idx: _design/medic`)
 * or extend the `os_process_timeout` (or both).
 * curl -X PUT  <serverUrl>/_node/<nodeName>/_config/couchdb/os_process_timeout -d '"100000"'
 *
 * Postmortem (2016-04-27) : after stopping couchdb, it would not start up
 * again.
 * Regardless why, this means that stopping the server is risky, so deletion
 * should be done without stopping the server.
 * After each deletion, the db gets reindexed and requests time out, so you
 * want to minimize this. So adjust the dates to small enough time increments
 * to have <100 docs deleted at a time.
 *
 * 2016-05-10 : introducing batchSize. Run each function (reports, persons,
 * or clinics) at a time (you don't want orphan contact persons...), by
 * commenting out the other two, until there's no more.
 * Until https://github.com/medic/medic/issues/2288 is solved, bump
 * the rev on a form in between each batch (see bump_rev.js).
 */

/* eslint-disable no-unused-vars */
'use strict';

const PouchDB = require('pouchdb');
const _ = require('underscore');
const url = require('url');
const utils = require('./delete_training_data_utils.js');

const deleteReports = function(db, dryrun, branchId, startTimestamp, endTimestamp, logdir, batchSize) {
  return utils.queryInBatches(
    function(skip) {
      console.log('Deleting reports');
      return utils.getDataRecordsForBranch(db, branchId, skip, batchSize);
    },
    function(docs, skip) {
      return Promise.resolve()
        .then(_.partial(utils.filterByDate, docs, startTimestamp, endTimestamp))
        .then(_.partial(utils.writeDocsToFile, logdir + '/reports_deleted_' + skip + '.json'))
        .then(_.partial(utils.writeDocsIdsToFile, logdir + '/reports_deleted_ids.json'))
        .then(_.partial(utils.deleteDocs, dryrun, db))
        .then(function(result) {
          console.log(result.length + ' reports deleted!\n');
          return result;
        });
    });
};

const deletePersons = function(db, dryrun, branchId, startTimestamp, endTimestamp, logdir, batchSize) {
  return utils.queryInBatches(
    function(skip) {
      console.log('Deleting persons');
      return utils.getContactsForPlace(db, branchId, skip, batchSize);
    },
    function(docs, skip) {
      return Promise.resolve()
        .then(_.partial(utils.filterByDate, docs, startTimestamp, endTimestamp))
        .then(_.partial(utils.filterByType, _, 'person'))
        .then(_.partial(utils.filterFamilyMembers, _, logdir))
        // Remove contact links
        .then(_.partial(utils.cleanContactPersons, db, dryrun, logdir))
        .then(_.partial(utils.writeDocsToFile, logdir + '/persons_deleted_' + skip + '.json'))
        .then(_.partial(utils.writeDocsIdsToFile, logdir + '/persons_deleted_ids.json'))
        .then(_.partial(utils.deleteDocs, dryrun, db))
        .then(function(result) {
          console.log(result.length + ' persons deleted!\n');
          return result;
        });
    });
};

const deleteClinics = function(db, dryrun, branchId, startTimestamp, endTimestamp, logdir, batchSize) {
  return utils.queryInBatches(
    function(skip) {
      console.log('Deleting clinics');
      // Need to fetch them all over again, because they could have been edited if
      // their contact was just deleted.
      return utils.getContactsForPlace(db, branchId, skip, batchSize);
    },
    function(docs, skip) {
      return Promise.resolve()
        .then(_.partial(utils.filterByDate, docs, startTimestamp, endTimestamp))
        .then(_.partial(utils.filterByType, _, 'clinic'))
        .then(_.partial(utils.writeDocsToFile, logdir + '/clinics_deleted_' + skip + '.json'))
        .then(_.partial(utils.writeDocsIdsToFile, logdir + '/clinics_deleted_ids.json'))
        .then(_.partial(utils.deleteDocs, dryrun, db))
        .then(function(result) {
          console.log(result.length + ' clinics deleted!\n');
          return result;
        });
    });
};

const deleteHealthCenters = function(db, dryrun, branchId, startTimestamp, endTimestamp, logdir, batchSize) {
  return Promise.resolve()
    .then(function() {
      console.log('Deleting health centers');
      return;
    })
    // Need to fetch them all over again, because they could have been edited if
    // their contact was just deleted.
    .then(_.partial(utils.getContactsForPlace, db, branchId, 0, batchSize))
    .then(_.partial(utils.filterByDate, _, startTimestamp, endTimestamp))
    .then(_.partial(utils.filterByType, _, 'health_center'))
    .then(_.partial(utils.writeDocsToFile, logdir + '/health_centers_deleted.json'))
    .then(_.partial(utils.deleteDocs, dryrun, db))
    .then(_.partial(utils.printoutDbStats, db))
    .then(function(result) {
      console.log(result.length + ' health centers deleted!\n');
      return;
    });
};

const deleteBranches = function(db, dryrun, branchId, startTimestamp, endTimestamp, logdir, batchSize) {

  return Promise.resolve()
    .then(function() {
      console.log('Deleting branches');
      return;
    })
    // Need to fetch them all over again, because they could have been edited if
    // their contact was just deleted.
    .then(_.partial(utils.fetchBranch, db, branchId))
    .then(_.partial(utils.filterByDate, _, startTimestamp, endTimestamp))
    .then(_.partial(utils.filterByType, _, 'district_hospital'))
    .then(_.partial(utils.writeDocsToFile, logdir + '/branches_deleted.json'))
    .then(_.partial(utils.deleteDocs, dryrun, db))
    .then(_.partial(utils.printoutDbStats, db))
    .then(function(result) {
      console.log(result.length + ' branch deleted!\n');
      return;
    });
};

// --------

if (process.argv.length < 7) {
  console.log('Not enough arguments.\n');
  console.log('Usage:\nnode delete_training_data.js <branchId> ' +
    '<startTime> <endTime> <logdir> <batchSize> [dryrun]\n');
  console.log('Will use DB URL+credentials from $COUCH_URL.');
  console.log('Deletes all \'data_record\', \'person\' and \'clinic\' data ' +
    'from a given branch (\'district_hospital\' type) that was created ' +
    'between the two timestamps.');
  console.log('The deleted docs will be written out to json files in the ' +
    'logdir.');
  console.log('The dryrun arg will run the whole process, including writing the files, without actually doing the ' +
    'deletions.\n');
  console.log('Example:\nexport COUCH_URL=\'http://admin:pass@localhost:5984/medic\'; node delete_training_data.js ' +
    '52857bf2cef066525b2feb82805fb373 "2016-04-11 07:00 GMT+3:00" "2016-04-25 17:00 GMT+3:00" ' +
    './training_data_20160425 500 dryrun');
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
  // Only uncomment one at a time. With the retries, it's not nicely organized any more.
//  .then(_.partial(deleteReports, db, dryrun, branchId, startTimestamp, endTimestamp, logdir, batchSize))
//  .then(_.partial(deletePersons, db, dryrun, branchId, startTimestamp, endTimestamp, logdir, batchSize))
//  .then(_.partial(deleteClinics, db, dryrun, branchId, startTimestamp, endTimestamp, logdir, batchSize))
//  .then(_.partial(deleteHealthCenters, db, dryrun, branchId, startTimestamp, endTimestamp, logdir, batchSize))
//  .then(_.partial(deleteBranches, db, dryrun, branchId, startTimestamp, endTimestamp, logdir, batchSize))
  .catch(function (err) {
    console.log('Error!!!');
    console.log(err);
  });

