#!/usr/bin/env node

/**
 * Migrate attachment binary data from CouchDB to MongoDB.
 *
 * CouchDB's _all_docs?include_docs=true returns attachment metadata (stubs)
 * but not the actual binary data. This script finds all docs with attachments,
 * fetches each attachment's binary data individually, and stores it in MongoDB.
 *
 * Usage:
 *   COUCH_URL=http://admin:pass@localhost:5984/medic \
 *   MONGO_URL=mongodb://localhost:27017 \
 *   node scripts/migrate/migrate-attachments.js
 */

const { MongoClient } = require('../../shared-libs/db-adapter/node_modules/mongodb');

const COUCH_URL = process.env.COUCH_URL;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE, 10) || 200;

if (!COUCH_URL) {
  console.error('COUCH_URL required');
  process.exit(1);
}

const parsedUrl = new URL(COUCH_URL);
const couchAuth = Buffer.from(`${parsedUrl.username}:${parsedUrl.password}`).toString('base64');
const couchBase = `${parsedUrl.protocol}//${parsedUrl.host}`;
const dbName = parsedUrl.pathname.replace(/^\//, '');

const couchFetch = async (url, binary = false) => {
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${couchAuth}` },
  });
  if (!response.ok) {
    return null;
  }
  return binary ? Buffer.from(await response.arrayBuffer()) : response.json();
};

const main = async () => {
  const connectUrl = MONGO_URL.includes('directConnection') ? MONGO_URL : `${MONGO_URL}/?directConnection=true`;
  const client = new MongoClient(connectUrl);
  await client.connect();
  const collection = client.db(dbName).collection('docs');

  console.log('Migrating attachment binary data from CouchDB to MongoDB...');
  console.log(`CouchDB: ${couchBase}/${dbName}`);
  console.log(`MongoDB: ${MONGO_URL}\n`);

  // Scan all CouchDB docs in batches to find ones with attachments
  let startkey = '';
  let hasMore = true;
  let totalDocs = 0;
  let totalAttachments = 0;
  let scanned = 0;

  while (hasMore) {
    const params = new URLSearchParams({
      include_docs: 'true',
      limit: String(BATCH_SIZE),
      startkey: JSON.stringify(startkey),
    });
    if (startkey) {
      params.set('skip', '1');
    }

    const result = await couchFetch(`${couchBase}/${dbName}/_all_docs?${params}`);
    if (!result?.rows?.length) {
      hasMore = false;
      break;
    }

    for (const row of result.rows) {
      const doc = row.doc;
      if (!doc || !doc._attachments) {
        continue;
      }
      if (doc._id.startsWith('_design/')) {
        continue;
      }

      scanned++;
      const attNames = Object.keys(doc._attachments);

      // Check if MongoDB already has complete attachment data for this doc
      const mongoDoc = await collection.findOne(
        { _id: doc._id },
        { projection: { _attachments: 1 } }
      );

      const existingAtts = mongoDoc?._attachments || {};
      const needsMigration = attNames.some(name => {
        const existing = existingAtts[name];
        return !existing?.data || existing.stub;
      });

      if (!needsMigration) {
        continue;
      }

      // Fetch binary data for each attachment from CouchDB
      const attachments = {};
      let migrated = 0;

      for (const attName of attNames) {
        // If we already have the binary data in MongoDB, keep it
        if (existingAtts[attName]?.data && !existingAtts[attName]?.stub) {
          attachments[attName] = existingAtts[attName];
          continue;
        }

        const att = doc._attachments[attName];
        const data = await couchFetch(
          `${couchBase}/${dbName}/${encodeURIComponent(doc._id)}/${encodeURIComponent(attName)}`,
          true
        );
        if (!data) {
          console.log(`    ${doc._id}/${attName}: FAILED to fetch`);
          continue;
        }

        attachments[attName] = {
          data: data,
          content_type: att.content_type,
          length: data.length,
        };
        migrated++;
      }

      if (migrated > 0) {
        // Set entire _attachments object to avoid dot-notation issues
        await collection.updateOne(
          { _id: doc._id },
          { $set: { _attachments: attachments } }
        );
        totalDocs++;
        totalAttachments += migrated;
        process.stdout.write(`  ${doc._id}: ${migrated}/${attNames.length} attachments migrated\n`);
      }
    }

    startkey = result.rows[result.rows.length - 1].key;
    process.stdout.write(`\r  Scanned ${scanned} docs with attachments...`);

    if (result.rows.length < BATCH_SIZE) {
      hasMore = false;
    }
  }

  console.log(`\n\nDone! Migrated ${totalAttachments} attachments across ${totalDocs} documents.`);
  await client.close();
};

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
