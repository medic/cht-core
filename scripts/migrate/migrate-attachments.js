#!/usr/bin/env node

/**
 * Migrate attachment binary data from CouchDB to MongoDB.
 * CouchDB's _all_docs doesn't include attachment data, so this script
 * fetches each attachment individually and stores it in MongoDB.
 *
 * Usage:
 *   COUCH_URL=http://admin:pass@localhost:5984/medic \
 *   MONGO_URL=mongodb://localhost:27017 \
 *   node scripts/migrate/migrate-attachments.js
 */

const { MongoClient } = require('../../shared-libs/db-adapter/node_modules/mongodb');

const COUCH_URL = process.env.COUCH_URL;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';

if (!COUCH_URL) {
  console.error('COUCH_URL required');
  process.exit(1);
}

const parsedUrl = new URL(COUCH_URL);
const couchAuth = Buffer.from(`${parsedUrl.username}:${parsedUrl.password}`).toString('base64');
const couchBase = `${parsedUrl.protocol}//${parsedUrl.host}`;
const dbName = parsedUrl.pathname.replace(/^\//, '');

// Documents known to have attachments
const DOCS_WITH_ATTACHMENTS = ['resources', 'branding', 'partners'];

const couchFetch = async (url, binary = false) => {
  const response = await fetch(url, {
    headers: { Authorization: `Basic ${couchAuth}` },
  });
  if (!response.ok) return null;
  return binary ? Buffer.from(await response.arrayBuffer()) : response.json();
};

const main = async () => {
  const connectUrl = MONGO_URL.includes('directConnection') ? MONGO_URL : `${MONGO_URL}/?directConnection=true`;
  const client = new MongoClient(connectUrl);
  await client.connect();
  const collection = client.db(dbName).collection('docs');

  console.log('Migrating attachment binary data from CouchDB to MongoDB...\n');

  for (const docId of DOCS_WITH_ATTACHMENTS) {
    const doc = await couchFetch(`${couchBase}/${dbName}/${docId}`);
    if (!doc || !doc._attachments) {
      console.log(`${docId}: no attachments`);
      continue;
    }

    const attNames = Object.keys(doc._attachments);
    console.log(`${docId}: ${attNames.length} attachments`);

    // Build the entire _attachments object to avoid dot-notation issues
    const attachments = {};
    for (const attName of attNames) {
      const att = doc._attachments[attName];
      const data = await couchFetch(`${couchBase}/${dbName}/${docId}/${encodeURIComponent(attName)}`, true);
      if (!data) {
        console.log(`  ${attName}: FAILED to fetch`);
        continue;
      }
      attachments[attName] = {
        data: data,
        content_type: att.content_type,
        length: data.length,
      };
      process.stdout.write(`  ${attName}: ${data.length} bytes\n`);
    }

    // Set entire _attachments object at once (avoids MongoDB dot-notation issues)
    await collection.updateOne(
      { _id: docId },
      { $set: { _attachments: attachments } }
    );
  }

  // Also migrate any other docs that have attachments
  const docsWithAtts = await collection.find({
    '_attachments': { $exists: true },
    '_id': { $nin: DOCS_WITH_ATTACHMENTS },
  }).project({ _id: 1, _attachments: 1 }).toArray();

  for (const doc of docsWithAtts) {
    const attNames = Object.keys(doc._attachments);
    const needsMigration = attNames.some(name => doc._attachments[name].stub === true || !doc._attachments[name].data);
    if (!needsMigration) continue;

    console.log(`\n${doc._id}: ${attNames.length} attachments`);
    const attachments = {};
    let migrated = false;
    for (const attName of attNames) {
      if (doc._attachments[attName]?.data) {
        attachments[attName] = doc._attachments[attName];
        continue;
      }
      const data = await couchFetch(`${couchBase}/${dbName}/${doc._id}/${encodeURIComponent(attName)}`, true);
      if (!data) continue;
      attachments[attName] = {
        data: data,
        content_type: doc._attachments[attName]?.content_type,
        length: data.length,
      };
      migrated = true;
      process.stdout.write(`  ${attName}: ${data.length} bytes\n`);
    }
    if (migrated) {
      await collection.updateOne(
        { _id: doc._id },
        { $set: { _attachments: attachments } }
      );
    }
  }

  console.log('\nDone!');
  await client.close();
};

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
