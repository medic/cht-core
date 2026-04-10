const PouchDB = require('pouchdb-core');
PouchDB.plugin(require('pouchdb-adapter-http'));
PouchDB.plugin(require('pouchdb-mapreduce'));
PouchDB.plugin(require('pouchdb-replication'));

const { neo4jDb } = require('./neo4j');
const mapper = require('./mapper');

const SEQ_DOC_ID = '_local/neo4j-sync-seq';
const BATCH_SIZE = 100;
const RETRY_TIMEOUT = 10000;
const INITIAL_SYNC_BATCH = 500;

let medicDb;
let changesRequest;
let running = false;

// Upsert a contact node with its label and properties
const upsertContact = async (session, doc) => {
  const label = mapper.typeToLabel(doc.type);
  const props = mapper.getContactProps(doc);

  // MERGE on _id, then SET all properties and add the specific type label
  await session.run(
    `MERGE (c:Contact {_id: $id})
     SET c += $props
     SET c:${label}`,
    { id: doc._id, props }
  );

  // Handle relationships
  const rels = mapper.getContactRelationships(doc);
  for (const rel of rels) {
    await session.run(
      `MERGE (a:Contact {_id: $sourceId})
       MERGE (b:${rel.targetLabel} {_id: $targetId})
       MERGE (a)-[:${rel.type}]->(b)`,
      { sourceId: doc._id, targetId: rel.targetId }
    );
  }
};

// Upsert a data_record node with its relationships
const upsertDataRecord = async (session, doc) => {
  const props = mapper.getDataRecordProps(doc);

  await session.run(
    `MERGE (r:DataRecord {_id: $id})
     SET r += $props`,
    { id: doc._id, props }
  );

  const rels = mapper.getDataRecordRelationships(doc);
  for (const rel of rels) {
    await session.run(
      `MERGE (a:DataRecord {_id: $sourceId})
       MERGE (b:${rel.targetLabel} {_id: $targetId})
       MERGE (a)-[:${rel.type}]->(b)`,
      { sourceId: doc._id, targetId: rel.targetId }
    );
  }
};

// Delete a node (both Contact and DataRecord)
const deleteNode = async (session, docId) => {
  await session.run(
    'MATCH (n {_id: $id}) DETACH DELETE n',
    { id: docId }
  );
};

// Process a single document change
const processChange = async (doc, deleted) => {
  const session = neo4jDb.getSession();
  try {
    if (deleted) {
      await deleteNode(session, doc._id || doc.id);
      return;
    }

    if (mapper.isContact(doc)) {
      await upsertContact(session, doc);
    } else if (mapper.isDataRecord(doc)) {
      await upsertDataRecord(session, doc);
    }
    // Ignore other document types (settings, translations, etc.)
  } finally {
    await session.close();
  }
};

// Save the last processed sequence to CouchDB
const saveSeq = async (seq) => {
  try {
    let doc;
    try {
      doc = await medicDb.get(SEQ_DOC_ID);
    } catch (err) {
      if (err.status === 404) {
        doc = { _id: SEQ_DOC_ID };
      } else {
        throw err;
      }
    }
    doc.seq = seq;
    await medicDb.put(doc);
  } catch (err) {
    console.error('Error saving sync sequence:', err.message);
  }
};

// Load the last processed sequence
const loadSeq = async () => {
  try {
    const doc = await medicDb.get(SEQ_DOC_ID);
    return doc.seq;
  } catch (err) {
    if (err.status === 404) {
      return 0;
    }
    throw err;
  }
};

// Initial bulk sync: fetch all existing documents in batches
const initialSync = async () => {
  console.log('Starting initial sync of existing documents...');
  let startKey = '';
  let total = 0;

  while (true) {
    const result = await medicDb.allDocs({
      include_docs: true,
      limit: INITIAL_SYNC_BATCH,
      startkey: startKey,
    });

    if (result.rows.length === 0) {
      break;
    }

    for (const row of result.rows) {
      if (!row.doc || row.id.startsWith('_design/')) {
        continue;
      }
      try {
        await processChange(row.doc, false);
      } catch (err) {
        console.error(`Error syncing doc ${row.id}:`, err.message);
      }
    }

    total += result.rows.length;
    console.log(`Initial sync: ${total} documents processed...`);

    if (result.rows.length < INITIAL_SYNC_BATCH) {
      break;
    }

    // Move startkey past the last key we processed
    startKey = result.rows[result.rows.length - 1].id + '\ufff0';
  }

  console.log(`Initial sync complete. ${total} documents processed.`);
};

// Start listening to the changes feed
const listenToChanges = async (since) => {
  console.log(`Listening to changes feed from seq: ${since || 'now'}`);

  changesRequest = medicDb.changes({
    live: true,
    since: since || 'now',
    include_docs: true,
    batch_size: BATCH_SIZE,
  });

  changesRequest
    .on('change', async (change) => {
      try {
        await processChange(change.doc || { _id: change.id }, change.deleted);
        await saveSeq(change.seq);
      } catch (err) {
        console.error(`Error processing change for ${change.id}:`, err.message);
      }
    })
    .on('error', (err) => {
      console.error('Changes feed error:', err.message);
      changesRequest = null;
      if (running) {
        console.log(`Retrying changes feed in ${RETRY_TIMEOUT / 1000}s...`);
        setTimeout(() => {
          loadSeq().then(seq => listenToChanges(seq));
        }, RETRY_TIMEOUT);
      }
    });
};

const start = async (couchUrl) => {
  medicDb = new PouchDB(couchUrl);
  running = true;

  const seq = await loadSeq();

  if (!seq) {
    // No previous sync - do initial bulk load then switch to live
    await initialSync();
    // After initial sync, get the current update_seq to start live from
    const info = await medicDb.info();
    await saveSeq(info.update_seq);
    await listenToChanges(info.update_seq);
  } else {
    // Resume from where we left off
    await listenToChanges(seq);
  }
};

const stop = () => {
  running = false;
  if (changesRequest) {
    changesRequest.cancel();
    changesRequest = null;
  }
};

const syncService = { start, stop };

module.exports = { syncService };
