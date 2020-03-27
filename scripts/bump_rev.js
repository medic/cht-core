'use strict';

const PouchDB = require('pouchdb');

const docId = process.argv[2];
const dbUrl = process.env.COUCH_URL;

const db = new PouchDB(dbUrl);

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
