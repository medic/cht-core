const { expect } = require('chai');

const waitForService = async (url, maxAttempts = 10, delay = 100) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (error) {
      // Wait and try again
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error(`Service at ${url} did not become available`);
};

describe('HAProxy with mock CouchDB', function() {
  this.timeout(3000);
  
  
  it('should respond before timeout', async () => {
    await waitForService('http://127.0.0.1:15984');
  });
  
  it('should receive response from couchdb', async () => {
    const response = await fetch('http://127.0.0.1:15984/');
    expect(response.ok).to.be.true;
    
    const data = await response.json();
    expect(data.couchdb).to.equal('Welcome to mock-couchdb');
  });
  
  it('should receive 404 response if path doesn\'t exist', async () => {
    const response = await fetch('http://127.0.0.1:15984/doesnotexist');
    expect(response.status).to.equal(404);
  });
  
  it('should return json on connection drop', async () => {
    
    const response = await fetch('http://127.0.0.1:15984/error/drop');
    expect(response.status).to.equal(502);
      
    const data = await response.json();
    expect(data.error).to.equal('502 Bad Gateway');
    
  });
});
