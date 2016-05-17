/**
 * Delete data for a group of CHPs within the branch.
 */

'use strict';

var PouchDB = require('pouchdb');
var _ = require('underscore');
var fs = require('fs');
var utils = require('./delete_training_data_utils.js');

var getUsernames = function(groupFile) {
  var group = [];
  try {
    group = fs.readFileSync(groupFile, 'utf8');
  } catch (err) {
    console.log('Couldnt open groupFile ' + groupFile + '. Aborting.');
    process.exit();
  }

  var lines = group.split('\n');
  lines = _.filter(lines, function(line) { return line !== ''; });
  lines = _.each(lines, function(line) { line.trim(); });
  if (lines.length === 0) {
    console.log('Groupfile contained no usernames. Aborting.');
    process.exit();
  }
  return Promise.resolve(lines);
};

var getUserObjects = function(db, group) {
  console.log('Getting users from db');
  var userSettingsNames = _.map(group, function(user) {
    return 'org.couchdb.user:' + user;
  });
  return db.allDocs({keys: userSettingsNames, include_docs: true})
    .then(function(result) {
      return _.map(result.rows, function(row) {
        if (row.error) {
          console.log('Couldnt get user ' + row.key + ' : ' + row.error);
          console.log('Aborting.');
          process.exit();
        }
        return row.doc;
      });
    })
    .then(function(users) {
      return _.map(users, function(user) {
        if (!user.facility_id) {
          console.log('No CHP area for ' + user._id);
          console.log('Aborting.');
          process.exit();
        }
        return { _id: user._id, facility_id: user.facility_id, contact_id: user.contact_id };
      });
    });
};

// input : [{ _id: user._id, facility_id: user.facility_id }]
var checkUsersAreInBranch = function(db, users, branchId) {
  console.log('Checking users are in branch ' + branchId + '\n');
  var facilities = _.map(users, function(user) {
    return user.facility_id;
  });
  var findBranch = function(doc) {
    if (!doc) {
      return;
    }
    if (doc.type === 'district_hospital') {
      return doc._id;
    }
    return findBranch(doc.parent);
  };
  return db.allDocs({keys: facilities, include_docs: true})
    .then(function(result) {
      _.each(result.rows, function(row) {
        var userBranch = findBranch(row.doc);
        if (!userBranch) {
          console.log('No branch found for ' + row.doc.name + ' (' + row.doc._id + ')');
          console.log('Aborting.');
          process.exit();
        }
        if (userBranch !== branchId) {
          console.log('User in wrong branch! ' + row.doc.name + ' (' + row.doc._id +
            ') is in branch ' + userBranch + ' instead of branch ' + branchId);
          console.log('Aborting.');
          process.exit();
        }
      });
      return users;
    });
};

// users is like [{ _id: user._id, facility_id: user.facility_id, contact_id: user.contact_id }]
var deleteReports = function(db, dryrun, branchId, users, startTimestamp, endTimestamp, logdir, batchSize) {
  return Promise.resolve()
    .then(function() {
      console.log('Deleting reports');
      return;
    })
    .then(_.partial(utils.getDataRecordsForBranch, db, branchId, batchSize))
    .then(_.partial(utils.filterByDate, _, startTimestamp, endTimestamp))
    .then(_.partial(filterReportsForGroup, _, users))
    .then(_.partial(utils.writeDocsToFile, logdir + '/reports_deleted.json'))
    .then(_.partial(utils.deleteDocs, dryrun, db))
    .then(_.partial(utils.printoutDbStats, db))
    .then(function(result) {
      console.log(result.length + ' reports deleted!\n');
      return users;
    });
};

var filterReportsForGroup = function(dataRecords, users) {
  var filtered = _.filter(dataRecords, function(record) {
    return !!_.find(users, function(user) {
      return record.contact._id === user.contact_id;
    });
  });
  console.log('Filtered for group : ' + filtered.length);
  return filtered;
};

// look at parent, if health_center then check, if not parent etc.
var filterPersonsForGroup = function(persons, users) {
  var filtered = _.filter(persons, function(person) {
    var found = !!_.find(users, function(user) {
      if (!person.parent || !person.parent.parent || !person.parent.parent._id) {
        console.log('no chp found for person ' + person.name + ' (' + person._id + ')');
        return false;
      }
      if (person.parent.parent.type !== 'health_center') {
        console.log('grandparent is not a chp - for person ' + person.name + ' (' + person._id + ')');
        return false;
      }
      if (person.parent.parent._id === user.facility_id) {
        console.log('match person ' + person._id + ' to chp ' + user._id);
      }
      return person.parent.parent._id === user.facility_id;
    });
    return found;
  });
  console.log('Filtered for group : ' + filtered.length);
  return filtered;
};

var deletePersons = function(db, dryrun, branchId, users, startTimestamp, endTimestamp, logdir, batchSize) {
  return Promise.resolve()
    .then(function() {
      console.log('Deleting persons');
      return;
    })
    .then(_.partial(utils.getContactsForPlace, db, branchId, batchSize))
    .then(_.partial(utils.filterByDate, _, startTimestamp, endTimestamp))
    .then(_.partial(utils.filterByType, _, 'person'))
    .then(_.partial(filterPersonsForGroup, _, users))
    // Remove contact links
    .then(_.partial(utils.cleanContactPersons, db, dryrun, logdir))
    .then(_.partial(utils.printoutDbStats, db))
    .then(_.partial(utils.writeDocsToFile, logdir + '/persons_deleted.json'))
    .then(_.partial(utils.deleteDocs, dryrun, db))
    .then(_.partial(utils.printoutDbStats, db))
    .then(function(result) {
      console.log(result.length + ' persons deleted!\n');
      return users;
    });
};

var filterClinicsForGroup = function(clinics, users) {
  var filtered = _.filter(clinics, function(clinic) {
    var index = _.find(users, function(user) {
      if (clinic.parent._id === user.facility_id) {
        console.log('FOUND : clinic ' + clinic._id + ' matched to user ' + user._id);
      }
      return clinic.parent._id === user.facility_id;
    });
    return !!index;
  });
  console.log('Filtered for group : ' + filtered.length);
  return filtered;
};

var deleteClinics = function(db, dryrun, branchId, users, startTimestamp, endTimestamp, logdir, batchSize) {
  return Promise.resolve()
    .then(function() {
      console.log('Deleting clinics');
      return;
    })
    // Need to fetch them all over again, because they could have been edited if
    // their contact was just deleted.
    .then(_.partial(utils.getContactsForPlace, db, branchId, batchSize))
    .then(_.partial(utils.filterByDate, _, startTimestamp, endTimestamp))
    .then(_.partial(utils.filterByType, _, 'clinic'))
    .then(_.partial(filterClinicsForGroup, _, users))
    .then(_.partial(utils.writeDocsToFile, logdir + '/clinics_deleted.json'))
    .then(_.partial(utils.deleteDocs, dryrun, db))
    .then(_.partial(utils.printoutDbStats, db))
    .then(function(result) {
      console.log(result.length + ' clinics deleted!\n');
      return users;
    });
};


// --------

if (process.argv.length < 7) {
  console.log('Not enough arguments.\n');
  console.log('Usage:\nnode delete_training_data_for_group.js ' +
    '<branchId> <groupFile> <startTime> <endTime> <logdir> [dryrun]\n');
  console.log('Will use DB URL+credentials from $COUCH_URL.');
  console.log('Deletes all \'data_record\', \'person\' and \'clinic\' data ' +
    'from a given branch (\'district_hospital\' type) for a group of users, that was created ' +
    'between the two timestamps.');
  console.log('The deleted docs will be written out to json files in the ' +
    'logdir.');
  console.log('The dryrun arg will run the whole process, including writing the files, without actually doing the deletions.\n');
  console.log('Example:\nexport COUCH_URL=\'http://admin:pass@localhost:5984/medic\'; node delete_training_data_for_group.js 52857bf2cef066525b2feb82805fb373 ./group1.txt "2016-04-11 07:00 GMT+3:00" "2016-04-25 17:00 GMT+3:00" ./training_data_20160425 dryrun');
  process.exit();
}

var now = new Date();
var dbUrl = process.env.COUCH_URL;
var branchId = process.argv[2];
var groupFile = process.argv[3];
var start = new Date(process.argv[4]);
var end = new Date(process.argv[5]);
var logdir = process.argv[6] + '/' + now.getTime();
var dryrun = process.argv[7];
dryrun = (dryrun === 'dryrun');
var batchSize = 20000;

var logfile = 'debug.log';
utils.setupLogging(logdir, logfile);

console.log('Now is ' + now.toUTCString() + '   (' + now + ')   (' + now.getTime() + ')\n');

var db = new PouchDB(dbUrl);
var startTimestamp = start.getTime();
var endTimestamp = end.getTime();

utils.fetchBranchInfo(db, branchId)
  .then(function(branchInfo) {
    var message = '\nStarting deletion process with\ndbUrl = $COUCH_URL' +
      '\nbranch = ' + JSON.stringify(branchInfo) +
      '\ngroupFile = ' + groupFile +
      '\nstartTimeMillis = ' + start.toUTCString() + ' (' + start.getTime() +
      ')\nendTimeMillis = ' + end.toUTCString() + ' (' + end.getTime() + ')\nlogdir = ' + logdir +
      '\nbatchSize = ' + batchSize +
      '\ndryrun = ' + dryrun + '\n';
    return utils.userConfirm(message);
  })
  .then(_.partial(getUsernames, groupFile))
  .then(_.partial(getUserObjects, db, _))
  .then(function(users) {
    console.log(users);
    return users;
  })
  .then(_.partial(checkUsersAreInBranch, db, _, branchId))
//  .then(_.partial(deleteReports, db, dryrun, branchId, _, startTimestamp, endTimestamp, logdir, batchSize))
//  .then(_.partial(deletePersons, db, dryrun, branchId, _, startTimestamp, endTimestamp, logdir, batchSize))
//  .then(_.partial(deleteClinics, db, dryrun, branchId, _, startTimestamp, endTimestamp, logdir, batchSize))
  .catch(function(err) {
    console.log('Error!!!');
    console.log(err);
  });
