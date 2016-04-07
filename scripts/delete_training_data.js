/**
 * Delete training data created on an instance.
 * Deletes reports, persons, clinics (=CHP areas for LG), within the training
 * branch, and within a time span.
 *
 * Usage:
 * node delete_training_data.js <dbUrl> <branchId> <startTimeMillis> <endTimeMillis>
 *
 * Example:
 * node delete_training_data.js http://admin:pass@localhost:5984/medic 52857bf2cef066525b2feb82805fb373 1458735592585 1458736086553
 */

'use strict';

var PouchDB = require('pouchdb');
var _ = require('underscore');

var getDocsFromRows = function(rows) {
    return _.map(rows, function(row) {
      return row.doc;
    });
};

// Note : instead of deleting docs, we set {_deleted: true}, so that the
// deletions are replicated to clients.
var deleteDocs = function(docs) {
  var docsWithDeleteField = _.map(docs, function(doc) {
    doc._deleted = true;
    return doc;
  });

  return db.bulkDocs(docsWithDeleteField)
    .then(function (result) {
      console.log('Got MASSSSSS DELETIONNNNNN');
      console.log(result);
    });
};

var getContactsForBranch = function(branchId) {
  return db.query(
    'medic/contacts_by_place',
    {key: [branchId], include_docs: true}
  ).then(function (result) {
    console.log('Got contacts for branch! ' + result.rows.length);
    var docs = getDocsFromRows(result.rows);
    return docs;
  });
};

var getDataReportsForBranch = function(branchId) {
  return db.query(
    'medic/data_records_by_district',
    {startkey: [branchId], endkey: [branchId + '\ufff0'], include_docs: true}
  ).then(function (result) {
    console.log('Got reports for branch! ' + result.rows.length);
    return getDocsFromRows(result.rows);
  });
};

var filterByDate = function(docsList, startTimestamp, endTimestamp) {
  var filteredList = _.filter(docsList, function(doc) {
    return doc.reported_date && doc.reported_date >= startTimestamp && doc.reported_date < endTimestamp;
  });
  console.log('Got filtered by date! ' + filteredList.length);
  return filteredList;
};

var groupByType = function(docsList) {
  return _.groupBy(docsList, 'type');
};




if (process.argv.length < 6) {
  console.log('Not enough arguments.');
  console.log('Usage:\nnode delete_training_data.js <dbUrl> <branchId> <startTimeMillis> <endTimeMillis>');
  console.log('Example:\nnode delete_training_data.js http://admin:pass@localhost:5984/medic 52857bf2cef066525b2feb82805fb373 1458735592585 1458736086553');
  process.exit();
}

var dbUrl = process.argv[2];
var branchId = process.argv[3];
var start = process.argv[4];
var end = process.argv[5];
console.log('\nStarting deletion process with\ndbUrl = ' + dbUrl + '\nbranchId = ' + branchId +
  '\nstartTimeMillis = ' + start + '\nendTimeMillis = ' + end + '\n\n');

var db = new PouchDB(dbUrl);

getDataReportsForBranch(branchId)
  .then(_.partial(filterByDate, _, start, end))
  .then(deleteDocs)
  // reports deleted!
  .then(_.partial(getContactsForBranch, branchId))
  .then(_.partial(filterByDate, _, start, end))
  .then(groupByType)
  .then(function(groupedDocs) {
    console.log('persons ' + (groupedDocs.person ? groupedDocs.person.length : 0));
    console.log('clinics ' + (groupedDocs.clinic ? groupedDocs.clinic.length : 0));
    return deleteDocs(groupedDocs.person)
      .then(deleteDocs(groupedDocs.clinic));
  })
  .catch(function (err) {
    console.log('shit happened');
    console.log(err);
  });
