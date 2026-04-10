const { syncService } = require('./src/sync');
const { neo4jDb } = require('./src/neo4j');

const COUCH_URL = process.env.COUCH_URL;
const NEO4J_URL = process.env.NEO4J_URL || 'bolt://neo4j:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'neo4jpassword';

if (!COUCH_URL) {
  console.error('COUCH_URL environment variable is required');
  process.exit(1);
}

process
  .on('unhandledRejection', reason => {
    console.error('Unhandled Rejection:', reason);
  })
  .on('uncaughtException', err => {
    console.error('UNCAUGHT EXCEPTION:', err);
    process.exit(1);
  });

(async () => {
  try {
    console.log('Initializing Neo4j connection...');
    await neo4jDb.connect(NEO4J_URL, NEO4J_USER, NEO4J_PASSWORD);
    await neo4jDb.ensureConstraints();
    console.log('Neo4j connected and constraints created.');

    console.log('Starting CouchDB → Neo4j sync...');
    await syncService.start(COUCH_URL);
    console.log('Sync service running.');
  } catch (err) {
    console.error('Fatal error starting neo4j-sync:', err);
    process.exit(1);
  }
})();

const shutdown = async () => {
  console.log('Shutting down...');
  syncService.stop();
  await neo4jDb.close();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
