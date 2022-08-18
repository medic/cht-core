const rpn = require('request-promise-native');

const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-adapter-http'));

const [,, instanceUrl] = process.argv;

const source = new PouchDB(`${instanceUrl}/medic`);
const dest = new PouchDB(`${instanceUrl}/medic-clone`);

const syncDocs = () => {
  return source.replicate
    .to(dest, { live: false, retry: true, heartbeat: 10000 })
    .catch(err => {
      console.error('Replication failed', err); // eslint-disable-line no-console
      process.exit(1);
    });
};

const getLocalDocs = async () => {
  const result = await rpn.get({
    url: `${instanceUrl}/medic/_local_docs?include_docs=true`,
    json: true,
  });
  console.log(JSON.stringify(result, null, 2));
  return result.rows.map(row => {
    delete row.doc._rev;
    return row.doc;
  });
};

const writeLocalDocs = (docs) => {
  return dest.bulkDocs(docs);
};

const syncLocalDocs = async () => {
  const localDocs = await getLocalDocs();
  await writeLocalDocs(localDocs);
};

(async () => {
  await syncDocs();
  await syncLocalDocs();
})();

