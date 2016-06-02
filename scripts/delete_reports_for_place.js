'use strict';

var PouchDB = require('pouchdb');
var _ = require('underscore');
var utils = require('./delete_training_data_utils.js');

var dbUrl = process.env.COUCH_URL;
var db = new PouchDB(dbUrl);
var placeId = process.argv[2];
var now = new Date();

//var logdir = './medic-projects-350/' + placeId + '/delete_reports/' + now.getTime(); var dryrun = false;
var logdir = './tmp/' + placeId + '/delete_reports/' + now.getTime(); var dryrun = true;

var logfile = 'debug.log';
utils.setupLogging(logdir, logfile);

console.log('Now is ' + now.toUTCString() + '   (' + now + ')   (' + now.getTime() + ')');
console.log('placeId ' + placeId);

db.get(placeId)
  .then(function(place) {
    console.log('Found place ' + place._id + ' : ' + place.name);

    return db.query(
      'medic/reports_by_place',
      {
        startkey: [placeId],
        endkey: [placeId + '\ufff0'],
        include_docs: true
      });
  })
  .then(function(result) {
    console.log('total_rows : ' + result.total_rows + ', offset : ' + result.offset);
    console.log('Records for place : ' + result.rows.length);
    return _.pluck(result.rows, 'doc');
  })
  .then(function(docs) {
    return Promise.resolve()
          .then(_.partial(utils.writeDocsToFile, logdir + '/reports_deleted.json', docs))
          .then(_.partial(utils.writeDocsIdsToFile, logdir + '/reports_deleted_ids.json', docs))
          .then(_.partial(utils.deleteDocs, dryrun, db, docs));
  })
  .catch(function(err) {
    console.log(err);
  });
