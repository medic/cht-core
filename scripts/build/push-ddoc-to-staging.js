const { readFile } = require('node:fs/promises');
const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
const { MARKET_URL, BUILDS_SERVER } = process.env;
const URL = `${MARKET_URL}/${BUILDS_SERVER}`;

(async () => {
  const ddocsBuffer = await readFile('build/staging.json');
  const ddocs = JSON.parse(ddocsBuffer.toString());
  const ddoc = ddocs?.docs?.[0];
  if (!ddoc) {
    throw new Error('error parsing staging.json');
  }
  const db = new PouchDB(URL);
  try {
    await db.put(ddoc);
  } catch (err) {
    if (err.status !== 409) {
      throw err;
    }

    const existingDoc = await db.get(ddoc._id);
    ddoc._rev = existingDoc._rev;
    await db.put(ddoc);
  }

  console.log('DDOC pushed to staging server');
})();
