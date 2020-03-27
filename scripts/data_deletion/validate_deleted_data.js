/**
 * Read in data saved to file by delete_training_data.js, and test its places and dates.
 */

'use strict';

const fs = require('fs');
const _ = require('underscore');

const branchId = process.argv[2];
const startMillis = process.argv[3];
const endMillis = process.argv[4];
const logdir = process.argv[5];

const getFileNames = function(logdir, contains, doesntContain) {
  const logfiles = fs.readdirSync(logdir);
  return _.filter(logfiles, function(filename) {
    return filename.includes(contains) && !filename.includes(doesntContain);
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


const testFile = function(file, type, findDistrictFunc) {
  // Check we haven't deleted CHP's contact doc. Deleted persons should be family members.
  const checkFamilyMember = function(doc) {
    if (doc.type === 'person') {
      if (!doc.parent) {
        console.log('No parent for person ' + doc.name + ' -- ' + doc._id);
      }
      if (doc.parent.type !== 'clinic') {
        console.log('Not a family member!! Person ' + doc.name + ' -- ' + doc._id +
          ' has parent of type ' + doc.parent.type);
      }
    }
  };

  let fileContents = '';
  try {
    fileContents = fs.readFileSync(file, 'utf8');
  } catch (err) {
    console.log('Couldnt open file ' + file + '. Skipping. ' + err + '\n');
    return;
  }
  // If several arrays were written to same file, concatenate them.
  fileContents = fileContents.replace(/\]\[/g, ',');

  const docs = JSON.parse(fileContents);
  console.log('Read ' + docs.length + ' ' + type + 's from file. Will print out any problems.');

  _.each(docs, function(doc) {
    checkFamilyMember(doc);
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
  });
  console.log('');
};

const testContactDeletion = function(deletedContactsIds, logdir, filename) {
  const contactId = filename.replace('cleaned_facilities_', '').replace('.json', '');
  if (contactId.length !== 36) {
    console.log('Couldnt find contactId in filename ' + filename + '. Skipping it.');
    return;
  }

  // Check contact is in deleted contacts file.
  if(deletedContactsIds &&
    !_.findWhere(deletedContactsIds, function(id) { return id === contactId; })) {
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

const getDeletedContactIds = function() {
  try {
    const fileContents = fs.readFileSync(logdir + '/persons_deleted_ids.json', 'utf8');
    return fileContents.split('\n');
  } catch (err) {
    console.log('Couldnt open file persons_deleted_ids.json.');
    throw err;
  }
};


const testType = function(type, logdir, findDistrictFunc) {
  console.log(type.toUpperCase() + 'S');
  const files = getFileNames(logdir, type + 's_deleted', 'ids');
  console.log(files);
  _.each(files, function(filename) {
    testFile(
      logdir + '/' + filename,
      type,
      findDistrictFunc);
  });
};

const testContactLinks = function() {
  console.log('CONTACT LINKS');
  const cleanedFacilitiesFiles = getFileNames(logdir, 'cleaned_facilities');
  if (cleanedFacilitiesFiles.length === 0) {
    console.log('No cleaned_facilities files. The end.');
    return;
  }
  console.log(cleanedFacilitiesFiles.length + ' cleaned_facilities files to look through.');
  const deletedContactIds = getDeletedContactIds();
  console.log(deletedContactIds.length + ' contacts files to look through.');
  _.each(cleanedFacilitiesFiles, function(cleanedFacilitiesFile) {
    testContactDeletion(deletedContactIds, logdir, cleanedFacilitiesFile);
  });
};

testType(
  'report',
  logdir,
  function(report) {
    return findDistrict(report.contact.parent, report._id);
  });

testType(
  'person',
  logdir,
  function(person) {
    return findDistrict(person, person._id);
  });

testType(
  'clinic',
  logdir,
  function(clinic) {
    return findDistrict(clinic, clinic._id);
  });

testContactLinks();

