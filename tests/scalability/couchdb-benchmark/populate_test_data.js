
const fetch = require('node-fetch');

const args = process.argv.slice(2);
let port = '5984';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--port' && args[i + 1]) {
    port = args[i + 1];
  }
}

const COUCHDB_URL = process.env.COUCHDB_URL || `http://admin:password@localhost:${port}`;
const DB_NAME = 'medic';
const BASE_URL = `${COUCHDB_URL}/${DB_NAME}`;

const NUM_CONTACTS = parseInt(process.env.NUM_CONTACTS || '1000', 10);
const NUM_REPORTS = parseInt(process.env.NUM_REPORTS || '5000', 10);
const BATCH_SIZE = 100;

console.log('📊 Populating test database with sample data...');
console.log(`   Target: ${NUM_CONTACTS} contacts, ${NUM_REPORTS} reports\n`);

const generatePerson = (id) => ({
  _id: `person-${id}`,
  type: 'person',
  name: `Test User ${id}`,
  phone: `+25570000${String(id).padStart(4, '0')}`,
  date_of_birth: new Date(
    1980 + Math.floor(Math.random() * 30),
    Math.floor(Math.random() * 12),
    Math.floor(Math.random() * 28)
  ).toISOString().split('T')[0],
  parent: {
    _id: `clinic-${Math.floor(id / 10)}`,
    parent: {
      _id: `health_center-${Math.floor(id / 100)}`
    }
  },
  reported_date: Date.now(),
  created_by: 'admin'
});

const generateReport = (id) => ({
  _id: `report-${id}`,
  type: 'data_record',
  form: 'assessment',
  patient_id: `person-${Math.floor(Math.random() * NUM_CONTACTS)}`,
  reported_date: Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000),
  fields: {
    patient_name: `Test User ${Math.floor(Math.random() * NUM_CONTACTS)}`,
    symptoms: ['fever', 'cough', 'headache'][Math.floor(Math.random() * 3)],
    notes: `Test report ${id} with some sample text content`
  },
  contact: {
    _id: `person-${Math.floor(Math.random() * NUM_CONTACTS)}`,
    parent: {
      _id: `clinic-${Math.floor(id / 10)}`
    }
  },
  created_by: 'admin'
});

const generatePlace = (id, type, parent) => ({
  _id: `${type}-${id}`,
  type,
  name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${id}`,
  parent: parent ? { _id: parent } : undefined,
  contact: {
    _id: `person-${id}`
  },
  reported_date: Date.now(),
  created_by: 'admin'
});

const uploadBatch = async (docs) => {
  const res = await fetch(`${BASE_URL}/_bulk_docs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docs })
  });

  if (!res.ok) {
    throw new Error(`Bulk upload failed: ${res.status} ${await res.text()}`);
  }

  return res.json();
};

const populateData = async () => {
  const startTime = Date.now();
  let places = [];

  try {
    console.log('🔍 Checking connection...');
    const upResponse = await fetch(`${COUCHDB_URL}/_up`);
    if (!upResponse.ok) throw new Error('CouchDB is not responding');
    console.log('✓ Connected to CouchDB\n');

    console.log('🏥 Creating places hierarchy...');
    const numHealthCenters = Math.ceil(NUM_CONTACTS / 100);
    const numClinics = Math.ceil(NUM_CONTACTS / 10);

    for (let i = 0; i < numHealthCenters; i++) {
      places.push(generatePlace(i, 'health_center'));
    }
    for (let i = 0; i < numClinics; i++) {
      places.push(generatePlace(i, 'clinic', `health_center-${Math.floor(i / 10)}`));
    }

    await uploadBatch(places);
    console.log(`✓ Created ${places.length} places\n`);

    console.log(`👥 Creating ${NUM_CONTACTS} contacts...`);
    let created = 0;

    for (let i = 0; i < NUM_CONTACTS; i += BATCH_SIZE) {
      const batch = [];
      for (let j = i; j < Math.min(i + BATCH_SIZE, NUM_CONTACTS); j++) {
        batch.push(generatePerson(j));
      }

      await uploadBatch(batch);
      created += batch.length;
      process.stdout.write(
        `\r   Progress: ${created}/${NUM_CONTACTS} (${Math.round((created / NUM_CONTACTS) * 100)}%)`
      );
    }
    console.log('\n✓ Contacts created\n');

    console.log(`📋 Creating ${NUM_REPORTS} reports...`);
    created = 0;

    for (let i = 0; i < NUM_REPORTS; i += BATCH_SIZE) {
      const batch = [];
      for (let j = i; j < Math.min(i + BATCH_SIZE, NUM_REPORTS); j++) {
        batch.push(generateReport(j));
      }

      await uploadBatch(batch);
      created += batch.length;
      process.stdout.write(
        `\r   Progress: ${created}/${NUM_REPORTS} (${Math.round((created / NUM_REPORTS) * 100)}%)`
      );
    }
    console.log('\n Reports created\n');

    try {
      const indexResponse = await fetch(
        `${BASE_URL}/_design/medic/_nouveau/docs_by_replication_key?q=type:person&limit=1`
      );

      if (indexResponse.ok) {
        console.log(' Index build triggered\n');
      } else {
        console.log(' Could not trigger index (may not be using Nouveau)\n');
      }
    } catch {
      console.log('Could not trigger index (may not be using Nouveau)\n');
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('Database population complete!');
    console.log(`   Total time: ${duration}s`);
    console.log(`   Total docs: ${places.length + NUM_CONTACTS + NUM_REPORTS}`);
    console.log('\n Ready to run benchmarks!');

  } catch (err) {
    console.error('\n Error:', err.message);
    process.exit(1);
  }
};

populateData();
