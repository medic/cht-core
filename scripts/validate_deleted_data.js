/**
 * Read in data saved to file by delete_training_data.js, and test its places and dates.
 */

'use strict';

var fs = require('fs');
var _ = require('underscore');

var branchId = process.argv[2];
var startMillis = process.argv[3];
var endMillis = process.argv[4];
var logdir = process.argv[5];

var findDistrict = function(place, originalId) {
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


var testDocs = function(file, type, findDistrictFunc) {
  var docs = JSON.parse(fs.readFileSync(file, 'utf8'));
  console.log('Read ' + docs.length + ' ' + type + 's from file. Will print out any problems.');

  _.each(docs, function(doc) {
      if (doc.reported_date < startMillis) {
          console.log(type + ' ' + doc._id + ' earlier than date range!! - ' + doc.reported_date + ' < ' + startMillis);
      }
      if (doc.reported_date >= endMillis) {
          console.log(type + ' ' + doc._id + ' later than date range!! - ' + doc.reported_date + ' >= ' + endMillis);
      }
      var district = findDistrictFunc(doc);
      if (district !== branchId) {
        console.log(type + ' ' + doc._id + ' in wrong branch! - ' + district + ' !== ' + branchId);
      }
  });
  console.log('');
};

var testContactDeletion = function(deletedContacts, logdir, filename) {
  var contactId = filename.replace('cleaned_facilities_', '').replace('.json', '');
  if (contactId.length !== 36) {
    console.log('Couldnt find contactId in filename ' + filename + '. Skipping it.');
    return;
  }

  // Check contact is in deleted contacts file.
  if(!_.findWhere(deletedContacts, { _id: contactId})) {
    console.log('Contact ' + contactId + ' not found in contacts file!!');
    return;
  }

  // Check is contact for each facility in the file.
  var facilities = JSON.parse(fs.readFileSync(logdir + '/' + filename, 'utf8'));
  _.each(facilities, function(facility) {
    if (facility.contact._id !== contactId) {
      console.log('Contact ' + contactId + ' is not contact for ' + facility._id);
    }
  });
};

testDocs(logdir + '/reports_deleted.json', 'report',
  function(report) {
    return findDistrict(report.contact.parent, report._id);
  });

testDocs(logdir + '/persons_deleted.json', 'person',
  function(person) {
    return findDistrict(person, person._id);
  });

testDocs(logdir + '/clinics_deleted.json', 'clinic',
  function(clinic) {
    return findDistrict(clinic, clinic._id);
  });

var deletedContacts = JSON.parse(fs.readFileSync(logdir + '/persons_deleted.json', 'utf8'));
var logfiles = fs.readdirSync(logdir);
console.log('Validating contact deletions. ' + logfiles.length + ' files to look through.');
_.each(logfiles, function(logfile) {
  testContactDeletion(deletedContacts, logdir, logfile);
});
