const chai = require('chai');
const { expect } = chai;


describe('CouchDB Cluster Unit Tests', () => {
  const COUCHDB_USER = process.env.COUCHDB_USER;
  const COUCHDB_PASSWORD = process.env.COUCHDB_PASSWORD;
  const COUCH_PORTS = ['15984', '25984', '35984'];
  const TEST_DB_NAME = 'tests';


  const requestOnNode = async (serverIndex, path, options = {}) => {
    const port = COUCH_PORTS[serverIndex];
    const url = `http://localhost:${port}${path}`;
    
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
      let body;
      try {
        body = await response.json();
      } catch (jsonError) {
        throw new Error(`Failed to parse JSON response: ${jsonError.message}`);
      }
      
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


  it('couchdb1.local node is available', async function () {
    this.timeout(2000);
    const response = await requestOnNode(0, '/_up');
    expect(response.body).to.have.property('status', 'ok');
  });

  it('couchdb2.local node is available', async function () {
    this.timeout(2000);
    const response = await requestOnNode(1, '/_up');
    expect(response.body).to.have.property('status', 'ok');
  });

  it('couchdb3.local node is available', async function () {
    this.timeout(2000);
    const response = await requestOnNode(2, '/_up');
    expect(response.body).to.have.property('status', 'ok');
  });

  it('should create the test database', async function () {
    const res = await requestOnNode(0, `/${TEST_DB_NAME}`, { method: 'PUT'});

    expect([201, 202]).to.include(res.status);
  });

  it('data inserted on one server can be retrieved from a peer', async function () {
    const id = Math.random().toString(36).substring(2, 34);

    // Insert doc on node 2
    await requestOnNode(1, `/${TEST_DB_NAME}/${id}`, {
      method: 'PUT',
      body: { Name: 'Test Cluster' }
    });


    // Retrieve from node 3
    const response = await requestOnNode(2, `/${TEST_DB_NAME}/${id}`);
    expect(response.body).to.have.property('Name', 'Test Cluster');
  });
  
  it('cluster membership shows all nodes', async function () {
    this.timeout(2000);
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
