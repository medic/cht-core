const fs = require('node:fs/promises');
const path = require('node:path');
const db = require('../api/src/db');

// (async () => {
//   const results = await db.medicUsersMeta.allDocs({ limit: 6000 });
//   console.log(`found ${results.total_rows} entries to remove`);
//   console.log('removed %d entries', (await Promise.all(results.rows.map(async (d, index) => {
//     await ((ms) => new Promise(r => setTimeout(r, ms)))(index * 10);
//     await db.medicUsersMeta.remove(d.id, d.value.rev);
//   }))).length);
// })();

(async () => {
  let telemetry = await fs.readFile(path.join(__dirname, 'telemetry.json'), 'utf8');
  telemetry = JSON.parse(telemetry);
  console.log(`importing ${telemetry.length} telemetry entries from ./telemetry.json`);
  const results = await db.medicUsersMeta.bulkDocs(telemetry);

  const successes = [];
  const duplicates = [];
  const errors = [];

  for (const result of results) {
    if (result.error) {
      if (result.status === 409) {
        duplicates.push(result);
        continue;
      }

      errors.push(result);
      continue;
    }

    successes.push(result);
  }

  await fs.writeFile(path.join(__dirname, 'telemetry_duplicates.json'), JSON.stringify(duplicates, null, 4), 'utf8');

  if (errors.length > 0) {
    errors.forEach(error => console.error(error));
  }
  console.log(`successfully inserted ${successes.length} entries`);
  console.log(`skipped ${duplicates.length} duplicated entries`);
  console.log(`ran into an error with ${errors.length} entries`);
})();
