const path = require('path');
const rewire = require('rewire');
const PouchDB = require('pouchdb');
PouchDB.plugin(require('pouchdb-adapter-leveldb'));
const { performance } = require('perf_hooks');

const [,, instanceUrl, dataDir, threadId, skipUsers] = process.argv;
const dataDirPath = path.resolve(dataDir || __dirname);
const users = require(path.resolve(dataDirPath, 'users.json'));
const config = require('./config');

const dataFactory = require('./data-factory');

const idx = ((+threadId || 0) + +skipUsers) % users.length;
console.log(idx, skipUsers);
const user = users[idx];
console.log(user);
let clinics;
const dbUrl = `${instanceUrl}/medic`;

const remoteDb = new PouchDB(dbUrl, {
  skip_setup: true,
  ajax: { timeout: 30000 },
  auth: { username: user.username, password: user.password }
});

const localDb = new PouchDB(path.join(dataDirPath, `/dbs/scalability-test-${user.username}`), { 
  adapter: 'leveldb',
  auto_compaction: true // Enable auto-compaction to prevent database bloat
});

// CHT-style bidirectional sync with proper error handling and timeouts
// Filter function to identify read-only documents (same as CHT)
const isReadOnlyDoc = (doc) => {
  const READ_ONLY_TYPES = ['form', 'translations'];
  const READ_ONLY_IDS = ['resources', 'branding', 'service-worker-meta', 'zscore-charts', 'settings', 'partners'];
  const DDOC_PREFIX = '_design/';
  
  // Never replicate "purged" documents upwards
  const keys = Object.keys(doc);
  if (keys.length === 4 &&
    keys.includes('_id') &&
    keys.includes('_rev') &&
    keys.includes('_deleted') &&
    keys.includes('purged')) {
    return true;
  }

  // Don't try to replicate read only docs back to the server
  return (
    READ_ONLY_TYPES.indexOf(doc.type) !== -1 ||
    READ_ONLY_IDS.indexOf(doc._id) !== -1 ||
    doc._id.indexOf(DDOC_PREFIX) === 0
  );
};

const replicateTo = async () => {
  const startTime = performance.now();
  try {
    console.log('Starting upload replication (local -> remote)...');
    
    const localInfo = await localDb.info();
    console.log(`Local DB: ${localInfo.doc_count} docs, update_seq: ${localInfo.update_seq}`);
    
    console.log(`Attempting to replicate to: ${dbUrl}`);
    console.log(`Using auth: ${user.username}:${user.password}`);
    
    const result = await localDb.replicate.to(remoteDb, {
      live: false,
      retry: true,
      timeout: 30000 // 30 second timeout to prevent hanging
    });
    
    console.log('Replication result:', result);
    
    const duration = performance.now() - startTime;
    console.log(`Upload replication completed in ${duration.toFixed(2)}ms`);
    console.log(`Uploaded: ${result.docs_written} docs, ${result.docs_read} docs read`);
    
    return result;
  } catch (err) {
    console.error('Upload replication failed:', err);
    throw err;
  }
};

const replicateFrom = async (previousReplicationResult) => {
  const startTime = performance.now();
  try {
    console.log('Starting sync replication (bidirectional)...');
    console.log('Simulating CHT sync behavior');
    
    // Simulate what happens when user clicks "sync" in CHT
    // This is incremental bidirectional replication, not full download
    
    // 1. Upload local changes to server (replicateTo)
    console.log('Uploading local changes to server...');
    const localInfo = await localDb.info();
    
    // Get only NEW changes since last sync (incremental)
    // Since we can't get remote info, we'll use the last_seq from the previous replication
    const lastReplicatedSeq = previousReplicationResult?.last_seq || 0;
    const localChanges = await localDb.changes({
      since: lastReplicatedSeq,
      include_docs: true
    });
    
    console.log(`Found ${localChanges.results.length} local changes since seq ${lastReplicatedSeq}`);
    
    let uploaded = 0;
    for (const change of localChanges.results) {
      if (change.doc && !isReadOnlyDoc(change.doc)) {
        try {
          await remoteDb.put(change.doc);
          uploaded++;
        } catch (err) {
          // Handle conflicts - server version wins
          if (err.status === 409) {
            console.log(`Conflict on ${change.doc._id}, keeping server version`);
          }
        }
      }
    }
    
    // 2. Download server changes to local (replicateFrom)
    console.log('Downloading server changes to local...');
    
    // Get changes since last sync (incremental)
    // Use a sequence number that should capture our uploaded data
    const serverChanges = await remoteDb.changes({
      since: 0, // Get all changes to see what's available
      include_docs: true
    });
    
    console.log(`Found ${serverChanges.results.length} server changes since seq ${localInfo.update_seq || 0}`);
    
    // Debug: Show what server changes we found
    if (serverChanges.results.length > 0) {
      console.log('Server changes details:');
      serverChanges.results.forEach((change, index) => {
        console.log(`  ${index + 1}. ID: ${change.id}, Rev: ${change.changes[0]?.rev}, Deleted: ${change.deleted || false}`);
        console.log(`     Has doc: ${!!change.doc}, Doc keys: ${change.doc ? Object.keys(change.doc) : 'none'}`);
      });
    }
    
    let downloaded = 0;
    let skipped = 0;
    for (const change of serverChanges.results) {
      if (change.doc && change.doc._id) {
        try {
          await localDb.put(change.doc);
          downloaded++;
          console.log(`  Downloaded: ${change.doc._id} (${change.doc.type})`);
        } catch (err) {
          // Handle conflicts by getting the latest version
          if (err.status === 409) {
            console.log(`  Conflict on ${change.doc._id}, getting latest version`);
            const latest = await remoteDb.get(change.doc._id);
            await localDb.put(latest);
            downloaded++;
          } else {
            console.log(`  Error downloading ${change.doc._id}: ${err.message}`);
            skipped++;
          }
        }
      } else {
        console.log(`  Skipped change (no doc or missing _id): ${change.id}`);
        if (change.doc) {
          console.log(`    Doc structure: ${JSON.stringify(change.doc, null, 2)}`);
        }
        skipped++;
      }
    }
    
    console.log(`Download summary: ${downloaded} downloaded, ${skipped} skipped`);
    
    const result = { read_docs: downloaded, uploaded_docs: uploaded };
    
    const duration = performance.now() - startTime;
    console.log(`Sync replication completed in ${duration.toFixed(2)}ms`);
    console.log(`Uploaded: ${result.uploaded_docs} docs, Downloaded: ${result.read_docs} docs`);
    
    return result;
  } catch (err) {
    console.error('Download replication failed:', err);
    throw err;
  }
};

const replicate = async () => {
  try {
    // Step 1: Upload local changes to server
    const uploadResult = await replicateTo();
    
    // Step 2: Download server changes to local
    await replicateFrom(uploadResult);
    
    console.log('Bidirectional sync completed successfully');
  } catch (err) {
    console.error('Bidirectional sync failed:', err);
    throw err;
  }
};

const getRandomParent = () => {
  if (!clinics || clinics.length === 0) {
    console.error('No clinics available for random selection');
    return null;
  }
  const idx = Math.floor(Math.random() * clinics.length);
  const selected = clinics[idx];
  if (!selected) {
    console.error(`Selected clinic at index ${idx} is null/undefined`);
    return null;
  }
  return selected;
};

const getClinics = async () => {
  try {
    const contacts = await localDb.query(
      'medic-client/contacts_by_type',
      { key: ['clinic'], include_docs: true }
    );
    clinics = contacts.rows.map(row => row.doc);
    console.log(`Found ${clinics.length} clinics`);
    
    // If no clinics found, try alternative query
    if (clinics.length === 0) {
      console.log('No clinics found with contacts_by_type view, trying alternative query...');
      const allDocs = await localDb.allDocs({ 
        include_docs: true,
        startkey: 'contact:',
        endkey: 'contact:\ufff0'
      });
      clinics = allDocs.rows
        .map(row => row.doc)
        .filter(doc => doc.type === 'clinic');
      console.log(`Found ${clinics.length} clinics with alternative query`);
    }
    
    if (clinics.length === 0) {
      console.error('No clinics found in local database - initial replication may have failed');
      console.error('This usually indicates the initial sync phase did not complete successfully');
      throw new Error('No clinics found in local database - initial replication may have failed');
    }
  } catch (err) {
    console.error('Error getting clinics:', err);
    throw err;
  }
};

const generateData = async () => {
  const t = performance.now();
  const docs = [];
  for (let i = 0; i < config.workflowContactsNbr.person; i++) {
    const parent = getRandomParent();
    if (!parent) {
      console.error(`Failed to get random parent for iteration ${i}`);
      console.error(`Available clinics: ${clinics ? clinics.length : 'undefined'}`);
      console.error(`Clinics array:`, clinics);
      throw new Error('Error choosing random clinic');
    }
    const [person] = dataFactory.generatePerson(parent, 'member_eligible_woman');
    const reports = dataFactory.generateReports(person, parent);
    docs.push(person, ...reports);
  }
  console.log('generation took ', performance.now() - t);
  const l = performance.now();
  await localDb.bulkDocs(docs);
  console.log('saving took ', performance.now() - l);
};

(async () => {
  try {
    console.log(`Starting workflow replication for user: ${user.username}`);
    console.log(`Thread ID: ${threadId}, Skip Users: ${skipUsers}`);
    console.log(`Iterations: ${config.workflowContactsNbr.iterations}`);
    
    await getClinics();
    
    for (let i = 0; i < config.workflowContactsNbr.iterations; i++) {
      console.log(`\n=== Iteration ${i + 1}/${config.workflowContactsNbr.iterations} ===`);
      
      // Generate new data locally
      await generateData();
      
      // Perform bidirectional sync
      await replicate();
      
      console.log(`Iteration ${i + 1} completed successfully`);
    }
    
    console.log('\n=== All iterations completed successfully ===');
    process.exit(0);
    
  } catch (err) {
    console.error('Error while replicating workflow data:', err);
    process.exit(1);
  }
})();