'use strict';

const PouchDB = require('pouchdb');
const _ = require('underscore');
const utils = require('./delete_training_data_utils.js');

const dbUrl = process.env.COUCH_URL;
const db = new PouchDB(dbUrl);
const placeId = process.argv[2];
const now = new Date();

//var logdir = './medic-projects-350/' + placeId + '/delete_contacts/' + now.getTime(); var dryrun = false;
const logdir = './tmp/' + placeId + '/delete_contacts/' + now.getTime(); const dryrun = true;

const logfile = 'debug.log';
utils.setupLogging(logdir, logfile);

console.log('Now is ' + now.toUTCString() + '   (' + now + ')   (' + now.getTime() + ')');
console.log('placeId ' + placeId);

db.get(placeId)
  .then(function(place) {
    console.log('Found place ' + place._id + ' : ' + place.name);

    return db.query(
      'medic-scripts/contacts_by_place',
      {
        startkey: [placeId],
        endkey: [placeId + '\ufff0'],
        include_docs: true
      });
  })
  .then(function(result) {
    console.log('total_rows : ' + result.total_rows + ', offset : ' + result.offset);
    console.log('persons for place : ' + result.rows.length);
    return _.pluck(result.rows, 'doc');
  })
  .then(function(docs) {
    return Promise.resolve()
      .then(_.partial(utils.filterFamilyMembers, docs))
      .then(_.partial(utils.writeDocsToFile, logdir + '/contacts_deleted.json', _))
      .then(_.partial(utils.writeDocsIdsToFile, logdir + '/contacts_deleted_ids.json', _))
      .then(_.partial(utils.deleteDocs, dryrun, db, _));
  })
  .catch(function(err) {
    console.log(err);
  });

