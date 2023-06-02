const { readFile } = require('node:fs/promises');
const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
const { MARKET_URL, BUILDS_SERVER } = process.env;
const URL = `${MARKET_URL}/${BUILDS_SERVER}`;

(async () => {
  const ddoc = await readFile('build/staging.json');
  const db = new PouchDB(URL);
  await db.put(ddoc);
  console.log('DDOC pushed to staging server');
})();
