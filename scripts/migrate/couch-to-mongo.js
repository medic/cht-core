#!/usr/bin/env node

/**
 * CouchDB → MongoDB migration script for CHT-core.
 *
 * Migrates all documents from CouchDB databases into MongoDB,
 * preserving _id and _rev fields. Creates changelog entries for
 * each document and sets up MongoDB indexes for view queries.
 *
 * Usage:
 *   COUCH_URL=http://admin:pass@localhost:5984/medic \
 *   MONGO_URL=mongodb://localhost:27017 \
 *   node scripts/migrate/couch-to-mongo.js
 *
 * Options (env vars):
 *   COUCH_URL     - CouchDB URL with database name (required)
 *   MONGO_URL     - MongoDB connection string (default: mongodb://localhost:27017)
 *   BATCH_SIZE    - Documents per batch (default: 200)
 *   SKIP_INDEXES  - Set to '1' to skip index creation
 */

const { MongoClient } = require('../../shared-libs/db-adapter/node_modules/mongodb');

const BATCH_SIZE = parseInt(process.env.BATCH_SIZE, 10) || 200;
const rawMongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const MONGO_URL = rawMongoUrl.includes('directConnection') ? rawMongoUrl : `${rawMongoUrl}/?directConnection=true`;
const COUCH_URL = process.env.COUCH_URL;

if (!COUCH_URL) {
  console.error('COUCH_URL environment variable is required');
  console.error('Example: COUCH_URL=http://admin:pass@localhost:5984/medic');
  process.exit(1);
}

const parsedCouchUrl = new URL(COUCH_URL);
const couchAuth = Buffer.from(`${parsedCouchUrl.username}:${parsedCouchUrl.password}`).toString('base64');
const couchBaseUrl = `${parsedCouchUrl.protocol}//${parsedCouchUrl.host}`;
const mainDbName = parsedCouchUrl.pathname.replace(/^\//, '');

const DATABASES_TO_MIGRATE = [
  mainDbName,
  `${mainDbName}-sentinel`,
  `${mainDbName}-logs`,
  `${mainDbName}-users-meta`,
  `${mainDbName}-vault`,
  '_users',
];

const couchFetch = async (url) => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Basic ${couchAuth}`,
    },
  });
  if (!response.ok) {
    throw new Error(`CouchDB request failed: ${response.status} ${response.statusText} for ${url}`);
  }
  return response.json();
};

const migrateDatabase = async (mongoClient, couchDbName, mongoDbName) => {
  const couchUrl = `${couchBaseUrl}/${couchDbName}`;

  // Check if CouchDB database exists
  try {
    await couchFetch(couchUrl);
  } catch (err) {
    console.log(`  Skipping ${couchDbName} (does not exist or not accessible)`);
    return { docs: 0, skipped: true };
  }

  const db = mongoClient.db(mongoDbName);
  const collection = db.collection('docs');

  // Get total doc count
  const info = await couchFetch(couchUrl);
  const totalDocs = info.doc_count || 0;
  console.log(`  ${couchDbName} → ${mongoDbName}: ${totalDocs} documents`);

  if (totalDocs === 0) {
    return { docs: 0 };
  }

  let migratedCount = 0;
  let startkey = '';
  let hasMore = true;

  while (hasMore) {
    const queryParams = new URLSearchParams({
      include_docs: 'true',
      limit: String(BATCH_SIZE),
      startkey: JSON.stringify(startkey),
    });
    if (startkey) {
      queryParams.set('skip', '1');
    }

    const result = await couchFetch(`${couchUrl}/_all_docs?${queryParams}`);
    const docs = result.rows
      .map(row => row.doc)
      .filter(doc => doc);

    if (docs.length === 0) {
      hasMore = false;
      break;
    }

    // Prepare documents for MongoDB
    const mongoDocs = docs.map(doc => {
      const mongoDoc = { ...doc };
      // Remove CouchDB-only fields that don't apply
      delete mongoDoc._conflicts;
      return mongoDoc;
    });

    // Upsert documents
    const bulkOps = mongoDocs.map(doc => ({
      replaceOne: {
        filter: { _id: doc._id },
        replacement: doc,
        upsert: true,
      },
    }));

    await collection.bulkWrite(bulkOps, { ordered: false });
    migratedCount += docs.length;

    // Record changelog entries
    const seqCounter = db.collection('_counters');
    const seqResult = await seqCounter.findOneAndUpdate(
      { _id: '_seq_counter' },
      { $inc: { value: docs.length } },
      { upsert: true, returnDocument: 'after' }
    );
    const startSeq = seqResult.value - docs.length + 1;
    const changelogDocs = docs.map((doc, i) => ({
      _seq: startSeq + i,
      id: doc._id,
      rev: doc._rev,
      deleted: !!doc._deleted,
      timestamp: new Date(),
    }));
    await db.collection('_changelog').insertMany(changelogDocs);

    process.stdout.write(`\r  Migrated: ${migratedCount}/${totalDocs}`);

    // Set next start key
    startkey = result.rows[result.rows.length - 1].key;

    if (result.rows.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  console.log(`\r  Migrated: ${migratedCount}/${totalDocs} ✓`);
  return { docs: migratedCount };
};

const migrateUserMetaDbs = async (mongoClient) => {
  // Discover and migrate all user-meta databases
  const allDbs = await couchFetch(`${couchBaseUrl}/_all_dbs`);
  const metaDbs = allDbs.filter(name =>
    name.startsWith(`${mainDbName}-user-`) && name.endsWith('-meta')
  );

  console.log(`\nFound ${metaDbs.length} user-meta databases`);
  let totalMetaDocs = 0;

  for (const dbName of metaDbs) {
    const result = await migrateDatabase(mongoClient, dbName, dbName);
    totalMetaDocs += result.docs || 0;
  }

  return totalMetaDocs;
};

const createIndexes = async (mongoClient) => {
  console.log('\nCreating MongoDB indexes...');
  const db = mongoClient.db(mainDbName);
  const collection = db.collection('docs');

  const indexes = [
    // Core document indexes
    { key: { type: 1 }, name: 'idx_type' },
    { key: { type: 1, contact_type: 1 }, name: 'idx_type_contact_type' },
    { key: { type: 1, form: 1 }, name: 'idx_type_form' },
    { key: { _deleted: 1 }, name: 'idx_deleted' },

    // contacts_by_depth — parent hierarchy
    { key: { 'parent._id': 1 }, name: 'idx_parent_id' },
    { key: { 'parent.parent._id': 1 }, name: 'idx_parent_parent_id' },
    { key: { 'parent.parent.parent._id': 1 }, name: 'idx_parent3_id' },

    // contacts_by_primary_contact
    { key: { 'contact._id': 1 }, name: 'idx_contact_id' },
    { key: { contact: 1 }, name: 'idx_contact_string' },

    // reports — subject/patient lookups (for docs_by_replication_key)
    { key: { patient_id: 1 }, name: 'idx_patient_id' },
    { key: { place_id: 1 }, name: 'idx_place_id' },
    { key: { 'fields.patient_id': 1 }, name: 'idx_fields_patient_id' },
    { key: { 'fields.place_id': 1 }, name: 'idx_fields_place_id' },
    { key: { 'fields.patient_uuid': 1 }, name: 'idx_fields_patient_uuid' },

    // tasks/targets by user/owner
    { key: { user: 1 }, name: 'idx_user' },
    { key: { owner: 1 }, name: 'idx_owner' },

    // messaging views
    { key: { 'tasks.state': 1 }, name: 'idx_tasks_state' },
    { key: { 'tasks.gateway_ref': 1 }, name: 'idx_tasks_gateway_ref' },
    { key: { 'tasks.messages.uuid': 1 }, name: 'idx_tasks_messages_uuid' },
    { key: { 'scheduled_tasks.gateway_ref': 1 }, name: 'idx_scheduled_tasks_gateway_ref' },
    { key: { 'scheduled_tasks.messages.uuid': 1 }, name: 'idx_scheduled_tasks_messages_uuid' },
    { key: { 'sms_message.gateway_ref': 1 }, name: 'idx_sms_gateway_ref' },

    // DHIS export
    { key: { 'dhis.orgUnit': 1 }, name: 'idx_dhis_orgunit' },

    // Changelog indexes
  ];

  for (const idx of indexes) {
    try {
      await collection.createIndex(idx.key, { name: idx.name, background: true });
      console.log(`  Created index: ${idx.name}`);
    } catch (err) {
      console.log(`  Index ${idx.name}: ${err.message}`);
    }
  }

  // Changelog indexes
  const changelog = db.collection('_changelog');
  await changelog.createIndex({ _seq: 1 }, { unique: true, name: 'idx_changelog_seq' });
  await changelog.createIndex({ id: 1, _seq: 1 }, { name: 'idx_changelog_id_seq' });
  console.log('  Created changelog indexes');

  console.log('Indexes created ✓');
};

const main = async () => {
  console.log('CHT-Core CouchDB → MongoDB Migration');
  console.log('=====================================');
  console.log(`CouchDB: ${couchBaseUrl}/${mainDbName}`);
  console.log(`MongoDB: ${MONGO_URL}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log('');

  const mongoClient = new MongoClient(MONGO_URL);
  await mongoClient.connect();

  try {
    // Migrate main databases
    console.log('Migrating databases...');
    let totalDocs = 0;

    for (const dbName of DATABASES_TO_MIGRATE) {
      const mongoDbName = dbName === '_users' ? `${mainDbName}-users` : dbName;
      const result = await migrateDatabase(mongoClient, dbName, mongoDbName);
      totalDocs += result.docs || 0;
    }

    // Migrate user-meta databases
    const metaDocs = await migrateUserMetaDbs(mongoClient);
    totalDocs += metaDocs;

    // Create indexes
    if (process.env.SKIP_INDEXES !== '1') {
      await createIndexes(mongoClient);
    }

    // Initialize replica set reminder
    console.log('\n=====================================');
    console.log(`Migration complete: ${totalDocs} documents migrated`);
    console.log('');
    console.log('To start the server with MongoDB:');
    console.log(`  DB_BACKEND=mongodb MONGO_URL=${MONGO_URL} npm run dev-api`);
    console.log('');
    console.log('Note: MongoDB must be running as a replica set for Change Streams.');
    console.log('For a single-node replica set:');
    console.log('  mongosh --eval "rs.initiate()"');

  } finally {
    await mongoClient.close();
  }
};

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
