const { expect } = require('chai');
const utils = require('@utils');
const constants = require('@constants');

describe('HTTP request should redirect to HTTPS', () => {
  it('should return a 301 status code and redirect to HTTPS @docker', async () => {
    const [jsonResponse, htmlResponse] = await Promise.all([
      utils.request({ uri: `http://${constants.API_HOST}/`, followRedirect: false, json: true }).catch(err => err),
      utils.request({ uri: `http://${constants.API_HOST}/`, followRedirect: false, json: false }).catch(err => err),
    ]);

    expect(jsonResponse.statusCode).to.be.equal(301);
    expect(htmlResponse.statusCode).to.be.equal(301);
    expect(jsonResponse.responseBody.error).to.be.equal('301 Moved Permanently');
    expect(htmlResponse.responseBody).to.contain('<title>301 Moved Permanently</title>');
  });
});

describe('HTTP acme-challenge should not redirect', () => {
  it('should return a 404 status code and not redirect @docker', async () => {
    const [jsonResponse, htmlResponse] = await Promise.all([
      utils.request({ uri: `http://${constants.API_HOST}/.well-known/acme-challenge/`, json: true }).catch(err => err),
      utils.request({ uri: `http://${constants.API_HOST}/.well-known/acme-challenge/`, json: false }).catch(err => err),
    ]);

    expect(jsonResponse.statusCode).to.be.equal(404);
    expect(htmlResponse.statusCode).to.be.equal(404);
    expect(jsonResponse.responseBody.error).to.be.equal('404 Not Found');
    expect(htmlResponse.responseBody).to.contain('<title>404 Not Found</title>');
  });
});

