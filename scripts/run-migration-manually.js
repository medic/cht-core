#!/bin/node

// Intentionally not ES6 because it may be run on old systems with an old node

const migrationLocation = process.argv[2];

if (!migrationLocation) {
  console.error('You must provide the migration to run as an argument.');
  process.exit(1);
}

if (!process.env.COUCH_URL) {
  console.error('You must define a COUCH_URL in your environment');
  console.error('e.g. COUCH_URL=http://admin:pass@localhost:5994/medic');
  process.exit(1);
}

const migration = require(migrationLocation);

console.log('Migration migration ' + migration.name);
console.log('Created on ' + migration.created);
console.log('Running manually...');

migration.run(function(err) {
  if (err) {
    console.error('There was an error manually running ' + migration.name);
    console.error(err);
    process.exit(1);
  }

  console.log(migration.name + ' was run successfully');
});
