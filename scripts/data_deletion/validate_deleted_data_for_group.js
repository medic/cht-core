/**
 * Read in data saved to file by delete_training_data_for_group.js, and test its places and dates.
 */

'use strict';

const _ = require('underscore');
const fs = require('fs');
const PouchDB = require('pouchdb');

if (process.argv.length < 7) {
  console.log('Usage:\nnode validate_deleted_data_for_group.js ' +
    '<branchId> <groupFile> <startTime> <endTime> <logdir>\n');
  process.exit();
}

const branchId = process.argv[2];
const groupFile = process.argv[3];
const start = new Date(process.argv[4]);
const end = new Date(process.argv[5]);
const logdir = process.argv[6];
const dbUrl = process.env.COUCH_URL;

const startMillis = start.getTime();
const endMillis = end.getTime();

const getUsernames = function(groupFile) {
  let group = [];
  try {
    group = fs.readFileSync(groupFile, 'utf8');
  } catch (err) {
    console.log('Couldnt open groupFile ' + groupFile + '. Aborting.');
    process.exit();
  }

  let lines = group.split('\n');
  lines = _.filter(lines, function(line) { return line !== ''; });
  lines = _.map(lines, function(line) { return line.trim(); });
  if (lines.length === 0) {
    console.log('Groupfile contained no usernames. Aborting.');
    process.exit();
  }
  console.log('Got ' + lines.length + ' users in file');
  return Promise.resolve(lines);
};

const getUserObjects = function(db, group) {
  console.log('Getting users from db');
  const userSettingsNames = _.map(group, function(user) {
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
      console.log('found ' + users.length + ' users in db');
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

const findDistrict = function(place, originalId) {
  if (!place) {
    throw new Error('no district for ' + originalId);
  }
  if (place.type === 'district_hospital') {
    return place._id;
  }
  return findDistrict(place.parent, originalId);
};

console.log('\nStarting validation with\nbranchId = ' + branchId +
  '\nstartTimeMillis = ' + startMillis + '\nendTimeMillis = ' + endMillis + '\nlogdir = ' + logdir + '\n');


const testDocs = function(logdir, type, findDistrictFunc, isInGroupFunc) {
  const logfiles = fs.readdirSync(logdir);
  const relevantLogFiles = _.filter(logfiles, function(file) {
    return file.includes(type);
  });
  console.log(relevantLogFiles);

  _.each(relevantLogFiles, function(file) {
    let fileContents = '';
    try {
      fileContents = fs.readFileSync(logdir + '/' + file, 'utf8');
    } catch (err) {
      console.log('Couldnt open file ' + file + '. Skipping. ' + err + '\n');
      return;
    }

    let docs;
    try {
      docs = JSON.parse(fileContents);
    } catch (err) {
      console.log('Couldnt parse into json.' + err + '\n');
      throw err;
    }

    console.log('Read ' + docs.length + ' ' + type + 's from file ' + file + '. Will print out any problems.');

    _.each(docs, function(doc) {
      if (doc.reported_date < startMillis) {
        console.log(type + ' ' + doc._id + ' earlier than date range!! - ' + doc.reported_date + ' < ' + startMillis);
      }
      if (doc.reported_date >= endMillis) {
        console.log(type + ' ' + doc._id + ' later than date range!! - ' + doc.reported_date + ' >= ' + endMillis);
      }
      const district = findDistrictFunc(doc);
      if (district !== branchId) {
        console.log(type + ' ' + doc._id + ' in wrong branch! - ' + district + ' !== ' + branchId);
      }
      if (!isInGroupFunc(doc)) {
        console.log(doc._id + ' is not in group!');
      }
    });
    console.log('');
  });
};

const testContactDeletion = function(deletedContacts, logdir, filename) {
  const contactId = filename.replace('cleaned_facilities_', '').replace('.json', '');
  if (contactId.length !== 36) {
    console.log('Couldnt find contactId in filename ' + filename + '. Skipping it.');
    return;
  }

  // Check contact is in deleted contacts file.
  if(deletedContacts && !_.findWhere(deletedContacts, { _id: contactId})) {
    console.log('Contact ' + contactId + ' not found in contacts file!!');
    return;
  }

  // Check is contact for each facility in the file.
  const facilities = JSON.parse(fs.readFileSync(logdir + '/' + filename, 'utf8'));
  _.each(facilities, function(facility) {
    if (facility.contact._id !== contactId) {
      console.log('Contact ' + contactId + ' is not contact for ' + facility._id);
    }
  });
};

const db = new PouchDB(dbUrl);

Promise.resolve()
  .then(_.partial(getUsernames, groupFile))
  .then(_.partial(getUserObjects, db, _))
  .then(function(users) {
    console.log('REPORTS');
    testDocs(
      logdir, 'report',
      // findDistrictFunc
      function(report) {
        return findDistrict(report.contact.parent, report._id);
      },
      // isInGroupFunc
      function(report) {
        return !!_.find(users, function(user) {
          return report.contact._id === user.contact_id;
        });
      });

    console.log('PERSONS');
    testDocs(
      logdir, 'person',
      // findDistrictFunc
      function(person) {
        return findDistrict(person, person._id);
      },
      // isInGroupFunc
      function(person) {
        return !!_.find(users, function(user) {
          return person.parent.parent._id === user.facility_id;
        });
      });

    console.log('CLINICS');
    testDocs(
      logdir, 'clinic',
      // findDistrictFunc
      function(clinic) {
        return findDistrict(clinic, clinic._id);
      },
      // isInGroupFunc
      function(clinic) {
        return !!_.find(users, function(user) {
          return clinic.parent._id === user.facility_id;
        });
      });

    console.log('CONTACT LINKS');
    const logfiles = fs.readdirSync(logdir);
    const relevantLogFiles = _.filter(logfiles, function(file) {
      return file.includes('person');
    });
    let deletedContacts = [];
    console.log(relevantLogFiles);
    _.each(relevantLogFiles, function(file) {
      try {
        const moreContacts = JSON.parse(fs.readFileSync(logdir + '/' + file, 'utf8'));
        deletedContacts = deletedContacts.concat(moreContacts);
      } catch (err) {
        console.log('Couldnt open file ' + file + '. Skipping. ' + err + '\n');
        return;
      }
    });
    console.log('Got ' + deletedContacts.length + ' deleted contacts.');
    console.log('Validating contact deletions. ' + logfiles.length + ' files to look through.');
    _.each(logfiles, function(logfile) {
      testContactDeletion(deletedContacts, logdir, logfile);
    });

  })
  .then(function(err) {
    console.log('ERROR!');
    console.log(err);
  });
