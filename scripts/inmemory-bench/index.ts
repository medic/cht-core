import { v4 as uuidv4 } from 'uuid';
import PouchDB from 'pouchdb-browser';
import inMemoryAdapter from 'pouchdb-adapter-memory';
PouchDB.plugin(inMemoryAdapter);

import rawCaresDocs from './cares.json';
import { docs as ddocs } from '../../build/ddocs/medic.json';

const allViews = Object.keys(ddocs[2].views);

const caresDocs = rawCaresDocs.map(({doc}) => {
  doc._id = uuidv4();
  delete doc._rev;
  delete doc._attachments;
  return doc;
});

console.log('rawCaresDocs', rawCaresDocs.length);

(async () => {
  const databases = [
    new PouchDB(`benchmark-idb-${uuidv4()}`),
    new PouchDB('benchmark-memory', { adapter: 'memory' }),
  ];

  const scenarios = [
    {
      name: 'contacts_by_type include_docs',
      func: (db: any) => db.query('medic-client/contacts_by_type', { include_docs: true }),
    },

    {
      name: 'contacts_by_type_freetext include_docs',
      func: (db: any) => db.query('medic-client/contacts_by_type_freetext', { include_docs: true }),
    },

    {
      name: 'allDocs all keys',
      func: (db: any) => db.allDocs({ keys: caresDocs.map(d => d._id) }),
    },
  ];

  for (const db of databases) {
    await db.bulkDocs(ddocs as any[]);
    for (let i = 0; i < 20; i++) {
      console.log(db.name, i);
      await db.bulkDocs(caresDocs);
    }
  }

  for (const db of databases) {
    const times = [];
    times.push(performance.now());
    for (const view of allViews) {
      await db.query(`medic-client/${view}`, { include_docs: true, reduce: false })
      times.push(performance.now());
      console.log(db.name, view);
    }
    logTimes(times);
    
    
    for (const scenario of scenarios) {
      const times = [];
      times.push(performance.now());
      for (let i = 0; i < 5; i++) {
        await scenario.func(db);
        times.push(performance.now());
      }
      
      console.log(db.name, scenario.name);
      logTimes(times);
    }
    console.log('\n\n');
  }
})();


function logTimes(times: number[]) {
  const deltas = times.reduce((agg: number[], time: number, currentIndex: number) => {
    if (currentIndex === 0) return [];

    const previous = times[currentIndex - 1];
    return [...agg, time - previous];
  }, []);
  console.table(deltas);
}
/*
idb adapter
how long will it take to start with 10k docs (push data into memory and warm views)
how long does view warming take in memory vs idb
how fast is a view query
* lots of keys
* all docs include docs
* _all_docs skip 1M
*/