'use strict';

var PouchDB = require('pouchdb');
//PouchDB.debug.enable('pouchdb:api'); // or
//PouchDB.debug.enable('pouchdb:http');
var _ = require('underscore');

var remoteDb = new PouchDB('http://admin:pass@localhost:5984/basic');
var localDb = new PouchDB('basicLocal');

var printInfoLocal = function() {
  return localDb.info()
      .then(function(info) {
        console.log(info.db_name, info.doc_count);
      });
};

var runReplication = function(options) {
  console.log('\n\n\nREPLICATION START - options', options);
  return PouchDB.replicate(remoteDb, localDb, options)
    .on('change', function (info) {
      // handle change
      console.info('change', info);
    }).on('paused', function (err) {
      // replication paused (e.g. replication up to date, user went offline)
      console.info('paused', err);
    }).on('active', function () {
      // replicate resumed (e.g. new changes replicating, user went back online)
      console.info('active');
    }).on('denied', function (err) {
      // a document failed to replicate (e.g. due to permissions)
      console.info('paused', err);
    }).on('complete', function (info) {
      // handle complete
      console.info('complete', info);
    }).on('error', function (err) {
      // handle error
      console.info('error', err);
    })
    .then(function(){
      console.log('\n\n\nREPLICATION STOP');
      // Print out all docs, local
      return localDb.allDocs()
        .then(function(data) {
          console.log(data.rows);
        });
    });
};

var remoteSeq = -1;
localDb.destroy()
  .then(function () {
    console.log('Wiped local db.');
    localDb = new PouchDB('basicLocal');
    return printInfoLocal();
  })
  .then(function() {
    return remoteDb.info()
        .then(function(info) {
          console.log(info.db_name, info.doc_count);
          remoteSeq = info.update_seq;
          console.log('remoteSeq', remoteSeq);
        });
  })
  // Fetch docs with a view.
  .then(function() {
		return remoteDb.query('example/testview')
			.then(function(data) {
				var docs = _.map(data.rows, function(row) {
					return row.value;
				});
				console.log('Got remote docs :\n', docs);
        return docs;
			});
	})
  // Insert docs into local db.
  .then(function(docs){
    // {new_edits: false} allows posting the docs with the same revision as the originals.
    return localDb.bulkDocs(docs, {new_edits: false})
      .then(function(result) {
        console.log(result);
      });
  })
  .then(printInfoLocal)
  .then(function(){
    // Print out all docs, local
    return localDb.allDocs()
      .then(function(data) {
        console.log(data.rows);
      });
  })

  // Start replication.
  .then(function(){
    return runReplication({since: remoteSeq});
  })

  // Rerun replication, without seq number.
  .then(function(){
    return runReplication({});
  })
  .catch(function(err) {
		console.log(err);
	});