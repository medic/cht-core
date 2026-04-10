const neo4j = require('neo4j-driver');

let driver;

const connect = async (url, user, password) => {
  driver = neo4j.driver(url, neo4j.auth.basic(user, password));
  // Verify connectivity
  await driver.verifyConnectivity();
};

const close = async () => {
  if (driver) {
    await driver.close();
  }
};

const getSession = () => driver.session();

const ensureConstraints = async () => {
  const session = getSession();
  try {
    // Unique constraint on _id for each node label
    await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (c:Contact) REQUIRE c._id IS UNIQUE');
    await session.run('CREATE CONSTRAINT IF NOT EXISTS FOR (r:DataRecord) REQUIRE r._id IS UNIQUE');
    // Index on type for faster lookups
    await session.run('CREATE INDEX IF NOT EXISTS FOR (c:Contact) ON (c.type)');
    await session.run('CREATE INDEX IF NOT EXISTS FOR (r:DataRecord) ON (r.form)');
  } finally {
    await session.close();
  }
};

const neo4jDb = {
  connect,
  close,
  getSession,
  ensureConstraints,
};

module.exports = { neo4jDb };
