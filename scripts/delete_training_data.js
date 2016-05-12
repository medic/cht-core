/**
 * Description and usage : see usage message below.
 *
 * Postmortem (2016-04-25) : editing/deleting data triggers reindexing, that
 * slows down couch, so you are likely to get `[Error: ETIMEDOUT] status: 400`
 * halfway through the script. You can either wait for indexing to be done
 * (couch logs will say `Index update finished for db: medic idx: _design/medic`)
 * or extend the `os_process_timeout` (or both).
 * curl -X PUT  <serverUrl>/_config/couchdb/os_process_timeout -d '"100000"'
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
 * Until https://github.com/medic/medic-webapp/issues/2288 is solved, bump
 * the rev on a form in between each batch (see bump_rev.js).
 */

'use strict';

var PouchDB = require('pouchdb');
var _ = require('underscore');
var fs = require('fs');
var mkdirp = require('mkdirp');
var prompt = require('prompt');
var util = require('util');

var log_file;
// Overload console.log to log to file.
var setupLogging = function(logdir, logfile) {
  if (!mkdirp.sync(logdir)) {
    console.log('Couldnt create logdir, aborting.');
    process.exit();
  }
  log_file = fs.createWriteStream(logdir + '/' + logfile, {flags : 'w'});
  log_file.write(''); // create file by writing in it
  var log_stdout = process.stdout;
  console.log = function(d) {
    log_file.write(util.format(d) + '\n');
    log_stdout.write(util.format(d) + '\n');
  };
};

var logToFile = function(d) {
  log_file.write(util.format(d) + '\n');
};

// Useful to keep track of the last seq number, and who knows what else?
var printoutDbStats = function(data) {
  return db.info().then(function (result) {
    console.log('DB stats - ' + JSON.stringify(result));
    return data;
  });
};

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
      return result;
    });
};

var getContactsForBranch = function(branchId, batchSize) {
  return db.query(
    'medic/contacts_by_place',
    {key: [branchId], include_docs: true, limit: batchSize}
  ).then(function (result) {
    console.log('Contacts for branch : ' + result.rows.length);
    var docs = getDocsFromRows(result.rows);
    return docs;
  });
};

var getDataReportsForBranch = function(branchId, batchSize) {
  return db.query(
    'medic/data_records_by_district',
    {startkey: [branchId], endkey: [branchId + '\ufff0'], include_docs: true, limit: batchSize}
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
      var ids = getIdsFromRows(result.rows);
      if (result.rows.length > 0) {
        console.log('Person ' + personId + ' is contact for ' + result.rows.length + ' facilities : ', ids);
      }
      return getDocsFromRows(result.rows);
    })
    .catch(function(err) {
      console.log('Error in isContactFor ' + personId);
      console.log(err);
      throw err;
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
// Do it them one after the other, rather than concurrently, to avoid too many requests on the DB.
var cleanContactPersons = function(personsList) {
  var promise = Promise.resolve();
  _.each(personsList, function(person) {
    promise = promise.then(function() { return cleanContactPerson(person); });
  });
  return promise.then(function() { return personsList; });
};

var cleanContactPerson = function(person) {
  return isContactFor(person._id)
      .then(function(facilities) {
        if (!facilities || facilities.length === 0) {
          return;
        }
        return writeDocsToFile(logdir + '/cleaned_facilities_' + person._id + '.json', facilities)
          .then(_.partial(removeContact, person));
      })
      .catch(function (err) {
        console.log('Error when removing contact ' + person._id);
        console.log(err);
        throw err;
      });
    };

var writeDocsToFile = function(filepath, docsList) {
  if (docsList.length === 0) {
    // don't write empty files.
    return docsList;
  }
  return new Promise(function(resolve,reject){
    fs.writeFile(filepath, JSON.stringify(docsList), function(err) {
      if(err) {
        return reject('Couldn\'t write to file' + filepath, err);
      }
      console.log('Wrote ' + docsList.length + ' docs to file ' + filepath);
      resolve(docsList);
    });
  });
};

var userConfirm = function() {
  return new Promise(function(resolve) {
    var message = '\nStarting deletion process with\ndbUrl = $COUCH_URL' +
      '\nbranchId = ' + branchId +
      '\nstartTimeMillis = ' + start.toUTCString() + ' (' + start.getTime() +
      ')\nendTimeMillis = ' + end.toUTCString() + ' (' + end.getTime() + ')\nlogdir = ' + logdir +
      '\nbatchSize = ' + batchSize +
      '\ndryrun = ' + dryrun + '\n';
    logToFile(message); // log to logfile because prompt doesn't.

    prompt.message = ''; // remove annoying pre-prompt message.
    prompt.start();
    var property = {
      name: 'yesno',
      message: message,
      validator: /y[es]*|n[o]?/,
      warning: 'Must respond yes or no',
      default: 'yes'
    };

    prompt.get(property, function (err, result) {
      if (err) {
        console.log(err);
        process.exit();
      }
      if (result.yesno !== 'yes') {
        console.log('User backed out. Exiting.');
        process.exit();
      }
      resolve();
    });
  });
};

var deleteReports = function(branchId, startTimestamp, endTimestamp, logdir, batchSize) {
  return Promise.resolve()
    .then(function() {
      console.log('Deleting reports');
      return;
    })
    .then(_.partial(getDataReportsForBranch, branchId, batchSize))
    .then(_.partial(filterByDate, _, startTimestamp, endTimestamp))
    .then(_.partial(writeDocsToFile, logdir + '/reports_deleted.json'))
    .then(deleteDocs)
    .then(printoutDbStats)
    .then(function(result) {
      console.log(result.length + ' reports deleted!\n');
      return;
    });
};

var deletePersons = function(branchId, startTimestamp, endTimestamp, logdir, batchSize) {
  return Promise.resolve()
    .then(function() {
      console.log('Deleting persons');
      return;
    })
    .then(_.partial(getContactsForBranch, branchId, batchSize))
    .then(_.partial(filterByDate, _, startTimestamp, endTimestamp))
    .then(_.partial(filterByType, _, 'person'))
    // Remove contact links
    .then(cleanContactPersons)
    .then(printoutDbStats)
    .then(_.partial(writeDocsToFile, logdir + '/persons_deleted.json'))
    .then(deleteDocs)
    .then(printoutDbStats)
    .then(function(result) {
      console.log(result.length + ' persons deleted!\n');
      return;
    });
};

var deleteClinics = function(branchId, startTimestamp, endTimestamp, logdir, batchSize) {
  return Promise.resolve()
    .then(function() {
      console.log('Deleting clinics');
      return;
    })
    // Need to fetch them all over again, because they could have been edited if
    // their contact was just deleted.
    .then(_.partial(getContactsForBranch, branchId, batchSize))
    .then(_.partial(filterByDate, _, startTimestamp, endTimestamp))
    .then(_.partial(filterByType, _, 'clinic'))
    .then(_.partial(writeDocsToFile, logdir + '/clinics_deleted.json'))
    .then(deleteDocs)
    .then(printoutDbStats)
    .then(function(result) {
      console.log(result.length + ' clinics deleted!\n');
      return;
    });
};


// --------

if (process.argv.length < 6) {
  console.log('Not enough arguments.\n');
  console.log('Usage:\nnode delete_training_data.js <branchId> ' +
    '<startTime> <endTime> <logdir> [dryrun]\n');
  console.log('Will use DB URL+credentials from $COUCH_URL.');
  console.log('Deletes all \'data_record\', \'person\' and \'clinic\' data ' +
    'from a given branch (\'district_hospital\' type) that was created ' +
    'between the two timestamps.');
  console.log('The deleted docs will be written out to json files in the ' +
    'logdir.');
  console.log('The dryrun arg will run the whole process, including writing the files, without actually doing the deletions.\n');
  console.log('Example:\nexport COUCH_URL=\'http://admin:pass@localhost:5984/medic\'; node delete_training_data.js 52857bf2cef066525b2feb82805fb373 "2016-04-11 07:00 GMT+3:00" "2016-04-25 17:00 GMT+3:00" ./training_data_20160425 dryrun');
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
var batchSize = 200;

setupLogging(logdir, 'debug.log');

console.log('Now is ' + now.toUTCString() + '   (' + now + ')   (' + now.getTime() + ')');

var db = new PouchDB(dbUrl);
var startTimestamp = start.getTime();
var endTimestamp = end.getTime();

userConfirm()
 // .then(_.partial(deleteReports, branchId, startTimestamp, endTimestamp, logdir, batchSize))
 // .then(_.partial(deletePersons, branchId, startTimestamp, endTimestamp, logdir, batchSize))
 // .then(_.partial(deleteClinics, branchId, startTimestamp, endTimestamp, logdir, batchSize))
  .catch(function (err) {
    console.log('Error!!!');
    console.log(err);
  });

