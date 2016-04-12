'use strict';

var PouchDB = require('pouchdb');
var _ = require('underscore');
var fs = require('fs');

if (process.argv.length < 4) {
  console.log('Not enough arguments.');
  console.log('Usage:\nnode restore_training_data.js <dbUrl> <logdir>');
  console.log('Example:\nnode restore_training_data.js http://admin:pass@localhost:5984/medic datadir');
  process.exit();
}

var dbUrl = process.argv[2];
var logdir = process.argv[3];
console.log('\nStarting restore process with\ndbUrl = ' + dbUrl + '\nlogdir = ' + logdir + '\n\n');

var db = new PouchDB(dbUrl);

var readDocsFromFile = function(filepath) {
  return new Promise(function(resolve,reject){
    fs.readFile(filepath, 'utf8', function(err, data) {
      if(err) {
        return reject(err);
      }
      data = JSON.parse(data);
      console.log('Read ' + data.length + ' docs from file ' + filepath);
      resolve(data);
    });
  });
};

var deleteRevs = function(docsList) {
  _.each(docsList, function(doc) {
    delete doc._rev;
  });
  return docsList;
};

var insertDocs = function(docsList) {
  return db.bulkDocs(docsList)
    .then(function (result) {
      console.log('Inserted : ' + result.length + ':');
      console.log(result);
      return result;
    });
};

var getDoc = function(id) {
  return db.get(id);
};

var getContactLinkFiles = function(dir) {
  return new Promise(function(resolve,reject){
    fs.readdir(dir, function(err, files) {
      if(err) {
        return reject(err);
      }
      files = _.filter(files, function(file) {
        return file.startsWith('cleaned_facilities_');
      });
      console.log(files);
      resolve(files);
    });
  });
};

var makeContactLinks = function(person, facilitiesList) {
  var promiseList = [];
  _.each(facilitiesList, function(facility) {
    // Re-fetch the doc, it could have been deleted + restored since then.
    var promise = getDoc(facility._id)
      .then(function(newFacility) {
        newFacility.contact = person;
        return [newFacility];
      })
      .then(insertDocs);
    promiseList.push(promise);
  });
  return Promise.all(promiseList);
};

var restoreContactLinks = function(files) {
  var promiseList = [];
  _.each(files, function(file) {
    var personId = file.replace('cleaned_facilities_', '').replace('.json', '');
    var promise = Promise.all([getDoc(personId), readDocsFromFile(logdir + '/' + file)])
      .then(makeContactLinks);
    promiseList.push(promise);
  });
  return Promise.all(promiseList);
};

// Restore clinics
readDocsFromFile(logdir + '/clinics_deleted.json')
  .then(deleteRevs)
  .then(insertDocs)
  // Restore persons
  .then(_.partial(readDocsFromFile,logdir + '/persons_deleted.json'))
  .then(deleteRevs)
  .then(insertDocs)
  // Restore contact links
  .then(_.partial(getContactLinkFiles, logdir))
  .then(restoreContactLinks)
  // Restore reports
  .then(_.partial(readDocsFromFile,logdir + '/reports_deleted.json'))
  .then(deleteRevs)
  .then(insertDocs)
  .catch(function (err) {
    console.log('shit happened');
    console.log(err);
  });

