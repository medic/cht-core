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
var fs = require('fs');

var getDocsFromRows = function(rows) {
  return _.map(rows, function(row) {
    return row.doc;
  });
};

var getIdsFromRows = function(rows) {
  return _.map(rows, function(row) {
    return row.id;
  });
};

// Note : instead of deleting docs, we set {_deleted: true}, so that the
// deletions are replicated to clients.
var deleteDocs = function(docs) {
  if (dryrun) {
    console.log('Dryrun : not deleting.');
    return docs;
  }
  var docsWithDeleteField = _.map(docs, function(doc) {
    doc._deleted = true;
    return doc;
  });

  return db.bulkDocs(docsWithDeleteField)
    .then(function (result) {
      console.log('Deleted : ' + result.length + ':');
      console.log(result);
    });
};

var getContactsForBranch = function(branchId) {
  return db.query(
    'medic/contacts_by_place',
    {key: [branchId], include_docs: true}
  ).then(function (result) {
    console.log('Contacts for branch : ' + result.rows.length);
    var docs = getDocsFromRows(result.rows);
    return docs;
  });
};

var getDataReportsForBranch = function(branchId) {
  return db.query(
    'medic/data_records_by_district',
    {startkey: [branchId], endkey: [branchId + '\ufff0'], include_docs: true}
  ).then(function (result) {
    console.log('Reports for branch : ' + result.rows.length);
    return getDocsFromRows(result.rows);
  });
};

var filterByDate = function(docsList, startTimestamp, endTimestamp) {
  var filteredList = _.filter(docsList, function(doc) {
    return doc.reported_date && doc.reported_date >= startTimestamp && doc.reported_date < endTimestamp;
  });
  console.log('Filtered by date : ' + filteredList.length);
  return filteredList;
};

var filterByType = function(docsList, type) {
  var filteredList = _.filter(docsList, function(doc) { return doc.type === type; });
  console.log('Filtered by type ' + type + ' : ' + filteredList.length);
  return filteredList;
};

// Find which facilities (if any) this person is a contact for.
var isContactFor = function(personId) {
  return db.query('medic/facilities_by_contact', {key: [personId], include_docs: true})
    .then(function(result) {
      console.log('Person ' + personId + ' is contact for ' + result.rows.length + ' facilities');
      var ids = getIdsFromRows(result.rows);
      console.log(ids);
      return getDocsFromRows(result.rows);
    });
};

var removeContact = function(person, facilitiesList) {
  _.each(facilitiesList, function(facility) {
    delete facility.contact;
  });

  if (dryrun) {
    console.log('Dryrun : not removing contact links.');
    return person;
  }

  return db.bulkDocs(facilitiesList)
    .then(function (result) {
      console.log('Removed contact ' + person._id + ' from ' + facilitiesList.length + ' facilities');
      console.log(result);
      return person;
    });
};

// If the persons are contacts for facilities, edit the facilities to remove the contact.
var cleanContactPersons = function(personsList) {
  var promiseList = [];
  _.each(personsList, function(person) {
    var promise = isContactFor(person._id)
      .then(_.partial(writeDocsToFile, logdir + '/cleaned_facilities_' + person._id + '.json'))
      .then(_.partial(removeContact, person))
      .catch(function (err) {
        console.log('shit happened when removing contact ' + person._id);
        console.log(err);
        throw err;
      });
    promiseList.push(promise);
  });
  return Promise.all(promiseList);
};

var writeDocsToFile = function(filepath, docsList) {
  if (docsList.length === 0) {
    // don't write empty files.
    return docsList;
  }
  return new Promise(function(resolve,reject){
    fs.writeFile(filepath, JSON.stringify(docsList), function(err) {
      if(err) {
        return reject(err);
      }
      console.log('Wrote ' + docsList.length + ' docs to file ' + filepath);
      resolve(docsList);
    });
  });
};


if (process.argv.length < 7) {
  console.log('Not enough arguments.');
  console.log('Usage:\nnode delete_training_data.js <dbUrl> <branchId> ' +
    '<startTimeMillis> <endTimeMillis> <logdir> [dryrun]');
  console.log('Deletes all \'data_record\', \'person\' and \'clinic\' data ' +
    'from a given branch (\'district_hospital\' type) that was created ' +
    'between the two timestamps.');
  console.log('The deleted docs will be written out to json files in the ' +
    'logdir.');
  console.log('The dryrun arg will run the whole process, including writing the files, without actually doing the deletions.');
  console.log('Example:\nnode delete_training_data.js http://admin:pass@localhost:5984/medic 52857bf2cef066525b2feb82805fb373 1458735592585 1458736086553 . dryrun');
  process.exit();
}

var dbUrl = process.argv[2];
var branchId = process.argv[3];
var start = process.argv[4];
var end = process.argv[5];
var logdir = process.argv[6];
var dryrun = process.argv[7];
dryrun = (dryrun === 'dryrun');

console.log('\nStarting deletion process with\ndbUrl = ' + dbUrl + '\nbranchId = ' + branchId +
  '\nstartTimeMillis = ' + start + '\nendTimeMillis = ' + end + '\nlogdir = ' + logdir + '\ndryrun = ' + dryrun + '\n');

var db = new PouchDB(dbUrl);

console.log('Deleting reports');
getDataReportsForBranch(branchId)
  .then(_.partial(filterByDate, _, start, end))
  .then(_.partial(writeDocsToFile, logdir + '/reports_deleted.json'))
  .then(deleteDocs)
  .then(function(result) {
    console.log('Reports deleted!\n\nDeleting persons');
    return result;
  })
  .then(_.partial(getContactsForBranch, branchId))
  .then(_.partial(filterByDate, _, start, end))
  .then(_.partial(filterByType, _, 'person'))
  .then(cleanContactPersons)
  .then(_.partial(writeDocsToFile, logdir + '/persons_deleted.json'))
  .then(deleteDocs)
  .then(function(result) {
    console.log('Persons deleted!\n\nDeleting clinics');
    return result;
  })
  // Need to fetch them all over again, because they could have been edited if
  // their contact was just deleted.
  .then(_.partial(getContactsForBranch, branchId))
  .then(_.partial(filterByDate, _, start, end))
  .then(_.partial(filterByType, _, 'clinic'))
  .then(_.partial(writeDocsToFile, logdir + '/clinics_deleted.json'))
  .then(deleteDocs)
  .then(function(result) {
    console.log('Clinics deleted!');
    return result;
  })
  .catch(function (err) {
    console.log('shit happened');
    console.log(err);
  });


