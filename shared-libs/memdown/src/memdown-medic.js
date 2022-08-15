/**
 * @module memdown-medic
 * @description Initialise an in-memory PouchDB instance using ddocs
 * defined at the supplied path.
 *
 * USAGE
 * 	memdownMedic = require('@medic/memdown');
 * 	memdownMedic('.')
 * 	  .then(db => {
 * 	    db.allDocs()
 * 	      .then(console.log)
 * 	      .catch(console.log);
 * 	  })
 */
const fs = require('fs');
const path = require('path');
const uuid = require('uuid').v4;

const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-memory'));
PouchDB.plugin(require('pouchdb-mapreduce'));

let ddocs;

const filesIn = (dir) => {
  return fs.readdirSync(dir).filter(it => !it.startsWith('.'));
};

const readFile = (path) => {
  return fs.readFileSync(path, { encoding: 'utf-8' });
};

const readOptionalFile = (path) => {
  if (fs.existsSync(path)) {
    return readFile(path);
  }
};

const loadView = (viewsDir, viewName) => {
  const viewDir = path.join(viewsDir, viewName);
  return {
    map: readFile(`${viewDir}/map.js`),
    reduce: readOptionalFile(`${viewDir}/reduce.js`),
  };
};

const loadDdoc = (rootDir, dbName, ddocName) => {
  let viewsDir;
  if (dbName) {
    viewsDir = path.join(rootDir, 'ddocs', dbName, ddocName, 'views');
  } else {
    viewsDir = path.join(rootDir, 'ddocs', ddocName, 'views');
  }
  const views = {};
  if (fs.existsSync(viewsDir)) {
    filesIn(viewsDir).forEach(view => views[view] = loadView(viewsDir, view));
  }
  ddocs.push({ _id: `_design/${ddocName}`, views });
};

module.exports = (rootDir='./') => {
  if (!ddocs) {
    ddocs = [];
    loadDdoc(rootDir, false, 'medic');
    filesIn(`${rootDir}/ddocs/medic-db`).forEach(ddoc => loadDdoc(rootDir, 'medic-db', ddoc));
  }
  const db = new PouchDB(uuid(), { adapter: 'memory' });
  return Promise.all(ddocs.map(ddoc => db.put(ddoc)))
    .then(() => db);
};
