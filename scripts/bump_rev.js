'use strict';

var PouchDB = require('pouchdb');

var docId = process.argv[2];
var dbUrl = process.env.COUCH_URL;

var db = new PouchDB(dbUrl);

db.get(docId)
	.then(function(result) {
		console.log('Got doc : ', result);
		return db.put(result);
	})
	.then(function(result) {
		console.log('\nPut doc : ', result);
	})
	.catch(function(err) {
		console.log('\nErr!', err);
	});