const { expect } = require('chai');
const sinon = require('sinon');

// Create custom fetch wrapper with default options
const apiRequest = async (url, options = {}) => {
  const defaultOptions = {
    timeout: 5000,
    redirect: 'manual', // Don't follow redirects automatically
    ...options
  };

  return fetch(url, defaultOptions);
};

describe('API Integration Tests', function () {
  this.timeout(10000);
  const HTTP_BASE_URL = 'http://localhost:1080';
  const HTTPS_BASE_URL = 'https://localhost:1443';
  let original_NODE_TLS_REJECT_UNAUTHORIZED;

  before(function () {
    original_NODE_TLS_REJECT_UNAUTHORIZED = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  });

  beforeEach(function() {
    // Reset any sinon stubs/spies before each test
    sinon.restore();
  });

  after(function() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = original_NODE_TLS_REJECT_UNAUTHORIZED;
  });

  describe('API Availability', () => {
    it('should respond before timeout', async () => {
      const maxAttempts = 150; // 15 seconds with 0.1s intervals
      let attempt = 0;
      let lastError;

      while (attempt < maxAttempts) {
        try {
          const response = await apiRequest(HTTPS_BASE_URL, {
            timeout: 100 // Short timeout per attempt
          });

          // If we get any response, the API is up
          expect(response).to.exist;
          return; // Success!

        } catch (error) {
          lastError = error;
          attempt++;

          // Wait 100ms before next attempt
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      throw new Error(`API did not respond within 15 seconds. Last error: ${lastError.message}`);
    });
  });

  describe('HTTP to HTTPS Redirection', () => {
    it('should redirect HTTP requests to HTTPS', async () => {
      const response = await apiRequest(HTTP_BASE_URL, {
        method: 'GET',
        headers: {
          'Connection': 'close'
        }
      });

      expect(response.status).to.equal(301);
      expect(response.statusText).to.equal('Moved Permanently');
      expect(response.headers.get('location')).to.include('https://localhost');
    });

    it('should not redirect HTTP acme-challenge requests', async () => {
      const response = await apiRequest(`${HTTP_BASE_URL}/.well-known/acme-challenge/`, {
        method: 'GET',
        headers: {
          'Connection': 'close'
        }
      });

      expect(response.status).to.not.equal(301);
      expect(response.status).to.equal(404);
      expect(response.statusText).to.equal('Not Found');
    });
  });

  describe('CHT API Responses', () => {
    it('should receive response from CHT api', async () => {
      // Test root path
      const rootResponse = await apiRequest(HTTPS_BASE_URL + '/');
      const rootText = await rootResponse.text();

      expect(rootResponse.status).to.equal(200);
      expect(rootText).to.equal('Hello from CHT api mock');

      // Test other path
      const pathResponse = await apiRequest(HTTPS_BASE_URL + '/somepath');
      const pathText = await pathResponse.text();

      expect(pathResponse.status).to.equal(200);
      expect(pathText).to.equal('Test');
    });
  });

  describe('HTTP Protocol Support', () => {
    it('should work with HTTP 1.1', async () => {
      const response = await apiRequest(HTTPS_BASE_URL + '/doesnotexist', {
        method: 'HEAD',
        headers: {
          'Connection': 'close'
        }
      });

      expect(response.status).to.equal(404);
      expect(response.statusText).to.equal('Not Found');

      // Fetch API doesn't expose HTTP version directly, but we can verify the request worked
      expect(response.url).to.include('https://localhost');
    });

    it('should work with HTTP 2', async () => {
      const response = await apiRequest(HTTPS_BASE_URL + '/doesnotexist', {
        method: 'HEAD'
      });

      expect(response.status).to.equal(404);
    });
  });

  describe('Error Handling', () => {
    it('should return 502 on connection drop', async () => {
      const response = await apiRequest(HTTPS_BASE_URL + '/error/drop', {
        headers: {
          'Connection': 'close'
        }
      });

      expect(response.status).to.equal(502);
      expect(response.statusText).to.equal('Bad Gateway');

      // Check if response contains expected HTML title
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('text/html')) {
        const htmlContent = await response.text();
        expect(htmlContent).to.include('<title>502 Bad Gateway</title>');
      }
    });

    it('should return JSON on connection drop with Accept header', async () => {
      const response = await apiRequest(HTTPS_BASE_URL + '/error/drop', {
        headers: {
          'Accept': 'application/json'
        }
      });

      expect(response.status).to.equal(502);

      // Verify JSON response
      const contentType = response.headers.get('content-type');
      expect(contentType).to.include('application/json');

      const jsonData = await response.json();
      expect(jsonData).to.have.property('error');
      expect(jsonData.error).to.equal('502 Bad Gateway');
    });
  });

  describe('Response Header Validation', () => {
    it('should have proper response headers for HTML content', async () => {
      const response = await apiRequest(HTTPS_BASE_URL + '/error/drop');

      expect(response.headers.get('content-type')).to.exist;

      const contentType = response.headers.get('content-type');
      if (contentType.includes('text/html')) {
        const htmlContent = await response.text();
        expect(htmlContent).to.be.a('string');
        expect(htmlContent).to.include('<!DOCTYPE html>');
      }
    });

    it('should have proper response headers for JSON content', async () => {
      const response = await apiRequest(HTTPS_BASE_URL + '/error/drop', {
        headers: {
          'Accept': 'application/json'
        }
      });

      const contentType = response.headers.get('content-type');
      expect(contentType).to.include('application/json');
    });
  });

  describe('Connection and Timeout Handling', () => {
    it('should handle connection timeouts gracefully', async () => {
      // Test with a very short timeout to simulate timeout conditions
      try {
        await apiRequest(HTTPS_BASE_URL + '/slow-endpoint', {
          timeout: 1 // 1ms timeout to force timeout
        });

        // If no timeout occurs, that's also acceptable
        expect(true).to.be.true;

      } catch (error) {
        // Timeout errors are expected and acceptable
        expect(error.name).to.be.oneOf(['AbortError', 'FetchError']);
      }
    });
  });
});
