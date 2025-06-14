const { expect } = require('chai');
const util = require('node:util');
const exec = util.promisify(require('node:child_process').exec);

const waitForService = async (url, maxAttempts =  30, delay = 100) => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
      throw response;
    } catch (error) {
      // Intentionally ignore errors while waiting for service
    } finally {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error(`Service at ${url} did not become available`);
};

describe('haproxy with mock CouchDB', function() {
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
    // Using curl instead of fetch due to known issues with fetch handling connection drops
    // See: https://github.com/nodejs/undici/issues/3492
    const { stdout } = await exec('curl -s http://127.0.0.1:15984/error/drop');
    
    const data = JSON.parse(stdout);
    expect(data.error).to.equal('502 Bad Gateway');
    
  });
});
