/**
 * Initialise an in-memory PouchDB instance using ddocs defined at the supplied
 * path.
 *
 * USAGE
 * 	memdownMedic = require('memdown-medic');
 * 	memdownMedic('.')
 * 	  .then(db => {
 * 	    db.allDocs()
 * 	      .then(console.log)
 * 	      .catch(console.log);
 * 	  })
 */
const fs = require('fs');
const uuid = require('uuid/v4');
const memdown = require('memdown');
const PouchDB = require('pouchdb').defaults({ db: memdown });

let ddocs;

function filesIn(dir) {
  return fs.readdirSync(dir).filter(it => !it.startsWith('.'));
}

function readFile(path) {
  return fs.readFileSync(path, { encoding: 'utf-8' });
}

function readOptionalFile(path) {
  if (fs.existsSync(path)) {
    return readFile(path);
  }
}

module.exports = (rootDir='./') => {
  function loadView(ddocName, viewName) {
    const viewDir = `${rootDir}/ddocs/${ddocName}/views/${viewName}`;
    return {
      map: readFile(`${viewDir}/map.js`),
      reduce: readOptionalFile(`${viewDir}/reduce.js`),
    };
  }

  function loadDdoc(ddocName) {
    const viewsDir = `${rootDir}/ddocs/${ddocName}/views`;

    let views = {};
    if (fs.existsSync(viewsDir)) {
      filesIn(viewsDir).forEach(view => views[view] = loadView(ddocName, view));
    }

    return { _id: `_design/${ddocName}`, views };
  }

  if (!ddocs) {
    ddocs = filesIn(`${rootDir}/ddocs`).map(loadDdoc);
  }
  const db = new PouchDB(uuid());
  return Promise.all(ddocs.map(ddoc => db.put(ddoc)))
    .then(() => db);
};
