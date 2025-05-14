const chai = require('chai');
const { expect } = chai;


describe('CouchDB Cluster Unit Tests', () => {
  const COUCHDB_USER = process.env.COUCHDB_USER;
  const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD;
  const COUCH_SERVERS = ['couchdb1.local', 'couchdb2.local', 'couchdb3.local'];
  const TEST_DB_NAME = 'tests';

  const requestOnNode = async (serverIndex, path, options = {}) => {
    const server = COUCH_SERVERS[serverIndex];
    const url = `http://${server}:5984${path}`;
    
    const fetchOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${COUCHDB_USER}:${COUCHDB_PASSWORD}`).toString('base64')}`,
        ...options.headers
      }
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }
    
    try {
      const response = await fetch(url, fetchOptions);
      const body = await response.json().catch(() => ({}));
      
      if (!response.ok && !options.allowError) {
        const error = new Error(`Request failed with status ${response.status}`);
        error.status = response.status;
        error.body = body;
        throw error;
      }
      
      return { 
        body,
        status: response.status,
        headers: response.headers
      };
    } catch (err) {
      if (!options.allowError) {
        throw err;
      }
      return err;
    }
  };

  before(async function () {
    this.timeout(60000);
  
    console.log('Setting up test database...');
    // Create test DB
    try {
      await requestOnNode(0, `/${TEST_DB_NAME}`, { method: 'PUT' });
      console.log(`Created test database '${TEST_DB_NAME}'`);
    } catch (err) {
      if (err.status === 412) {
        console.log(`Test database '${TEST_DB_NAME}' already exists`);
      } else {
        throw err;
      }
    }
  });

  after(async function () {
    this.timeout(30000);
    console.log('Cleaning up test database...');
    try {
      // Clean up test DB
      await requestOnNode(0, `/${TEST_DB_NAME}`, {
        method: 'DELETE',
        allowError: true
      });
    } catch (err) {
      console.log('Error cleaning up database:', err.message);
    }
  });

  it('couchdb1.local node is available', async function () {
    this.timeout(5000);
    const response = await requestOnNode(0, '/_up');
    expect(response.body).to.have.property('status', 'ok');
  });

  it('couchdb2.local node is available', async function () {
    this.timeout(5000);
    const response = await requestOnNode(1, '/_up');
    expect(response.body).to.have.property('status', 'ok');
  });

  it('couchdb3.local node is available', async function () {
    this.timeout(5000);
    const response = await requestOnNode(2, '/_up');
    expect(response.body).to.have.property('status', 'ok');
  });

  it('data inserted on one server can be retrieved from a peer', async function () {
    this.timeout(15000);
    const id = Math.random().toString(36).substring(2, 34);
    console.log(`Testing document replication with id: ${id}`);

    // Insert doc on node 2
    await requestOnNode(1, `/${TEST_DB_NAME}/${id}`, {
      method: 'PUT',
      body: { Name: 'Test Cluster' }
    });

    // Allow time for replication
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Retrieve from node 3
    const response = await requestOnNode(2, `/${TEST_DB_NAME}/${id}`);
    expect(response.body).to.have.property('Name', 'Test Cluster');
  });
  
  it('cluster membership shows all nodes', async function () {
    this.timeout(10000);
    const response = await requestOnNode(0, '/_membership');
    const membership = response.body;
    
    expect(membership.all_nodes).to.include.members([
      'couchdb@couchdb1.local',
      'couchdb@couchdb2.local',
      'couchdb@couchdb3.local'
    ]);
    expect(membership.cluster_nodes).to.include.members([
      'couchdb@couchdb1.local',
      'couchdb@couchdb2.local',
      'couchdb@couchdb3.local'
    ]);
  });
});