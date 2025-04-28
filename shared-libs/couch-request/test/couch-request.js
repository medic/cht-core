const chai = require('chai').use(require('chai-as-promised'));
const expect = chai.expect;
const sinon = require('sinon');
const rewire = require('rewire');

chai.config.truncateThreshold = 0;

describe('couch-request', () => {
  let couchRequest;
  let uri;
  let response;
  let audit;

  const buildResponse = ({ status=200, body, headers=new Headers(), json=true } = {}) => {
    if (json) {
      headers.append('content-type', 'application/json');
    }
    response = {
      ok: status >= 200 && status < 300,
      status,
      json: sinon.stub().resolves(body),
      text: sinon.stub().resolves(body),
      headers,
    };
    return response;
  };

  beforeEach(() => {
    sinon.stub(process, 'env').value({
      ...process.env,
      COUCH_URL: 'http://admin:password@test.com:5984/medic',
      ADD_SERVERNAME_TO_HTTP_AGENT: 'true' 
    });

    uri = `http://admin:password@test.com:5984/medic/_all_docs`;
    sinon.stub(global, 'fetch').resolves(buildResponse({ body: 'yes' }));

    audit = require('@medic/audit');
    sinon.stub(audit, 'fetchCallback');
    couchRequest = rewire('../src/couch-request');
  });

  afterEach(() => {
    sinon.restore();
  });
  
  it('should make basic GET request', async () => {
    global.fetch.resolves(buildResponse({ body: 'yes' }));
    expect(await couchRequest.get({ uri })).to.equal('yes');
    expect(global.fetch.args[0][1]).to.deep.include({ method: 'GET' });
  }); 
  
  it('should make basic POST request', async () => {
    global.fetch.resolves(buildResponse({ body: 'no' }));
    expect(await couchRequest.post({ uri })).to.equal('no');
    expect(global.fetch.args[0][1]).to.deep.include({ method: 'POST' });
  }); 
  
  it('should make basic PUT request', async () => {
    global.fetch.resolves(buildResponse({ body: 'maybe' }));
    expect(await couchRequest.put({ uri })).to.equal('maybe');
    expect(global.fetch.args[0][1]).to.deep.include({ method: 'PUT' });
  }); 
  
  it('should make basic DELETE request', async () => {
    global.fetch.resolves(buildResponse({ body: 'sometimes' }));
    expect(await couchRequest.delete({ uri })).to.equal('sometimes');
    expect(global.fetch.args[0][1]).to.deep.include({ method: 'DELETE' });
  }); 
  
  it('should make basic HEAD request', async () => {
    global.fetch.resolves(buildResponse({ body: 'everytime' }));
    expect(await couchRequest.head({ uri })).to.equal('everytime');
    expect(global.fetch.args[0][1]).to.deep.include({ method: 'HEAD' });
  });

  it('should throw an error when no uri is set', async () => {
    await expect(couchRequest.get()).to.eventually.be.rejectedWith('Missing uri/url parameter.');
    await expect(couchRequest.post()).to.eventually.be.rejectedWith('Missing uri/url parameter.');
    await expect(couchRequest.put()).to.eventually.be.rejectedWith('Missing uri/url parameter.');
    await expect(couchRequest.delete()).to.eventually.be.rejectedWith('Missing uri/url parameter.');
    await expect(couchRequest.head()).to.eventually.be.rejectedWith('Missing uri/url parameter.');
  });

  it('should throw an error on invalid url', async () => {
    const opts = {
      uri: 'not an url',
    };
    await expect(couchRequest.get(opts))
      .to.eventually.be.rejectedWith('Invalid uri/url parameter. Please use a valid URL.');
  });

  it('should use uri over url', async () => {
    const opts = {
      url: 'http://admin:password@test.com:5984/medic',
      uri: 'http://admin:password@test.com:5984/medic/test',
    };
    expect(await couchRequest.get(opts)).to.equal('yes');

    expect(global.fetch.args[0]).to.deep.equal([
      'http://test.com:5984/medic/test',
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: `Basic ${btoa('admin:password')}`,
        },
        servername: 'test.com',
        uri: 'http://test.com:5984/medic/test',
      }
    ]);

    expect(audit.fetchCallback.args).to.deep.equal([[
      'http://test.com:5984/medic/test',
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: `Basic ${btoa('admin:password')}`,
        },
        servername: 'test.com',
        uri: 'http://test.com:5984/medic/test',
      },
      {
        ...response,
        streamed: true,
        body: 'yes'
      },
      undefined,
    ]]);
  });

  it('should use url', async () => {
    const opts = {
      url: 'http://admin:password@test.com:5984/medic/omg',
    };

    await couchRequest.post(opts);

    expect(global.fetch.args[0]).to.deep.equal([
      'http://test.com:5984/medic/omg',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: `Basic ${btoa('admin:password')}`,
        },
        servername: 'test.com',
        uri: 'http://test.com:5984/medic/omg',
      }
    ]);
  });

  it('should add baseUrl to root url', async () => {
    const opts = {
      baseUrl: 'http://admin:pass@test.com:5984/medic/',
      uri: '/doc/attachment'
    };

    await couchRequest.put(opts);

    expect(global.fetch.args[0]).to.deep.equal([
      'http://test.com:5984/medic/doc/attachment',
      {
        method: 'PUT',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: `Basic ${btoa('admin:pass')}`,
        },
        servername: 'test.com',
        uri: 'http://test.com:5984/medic/doc/attachment',
      }
    ]);
  });

  it('should add query string', async () => {
    const opts = {
      uri: 'http://admin:pass@test.com:5984/medic',
      qs: {
        number: 2,
        string: 'yes',
        array: ['one', 'two'],
        boolean: true
      }
    };

    await couchRequest.delete(opts);

    expect(global.fetch.args[0]).to.deep.equal([
      'http://test.com:5984/medic?number=2&string=yes&array=%5B%22one%22%2C%22two%22%5D&boolean=true',
      {
        method: 'DELETE',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: `Basic ${btoa('admin:pass')}`,
        },
        servername: 'test.com',
        uri: 'http://test.com:5984/medic?number=2&string=yes&array=%5B%22one%22%2C%22two%22%5D&boolean=true',
      }
    ]);
  });

  it('should add auth headers when using auth parameter', async () => {
    const opts = {
      url: 'http://test.com:5984/medic/oops',
      auth: { username: 'admin', password: '123456' },
    };

    await couchRequest.head(opts);

    expect(global.fetch.args[0]).to.deep.equal([
      'http://test.com:5984/medic/oops',
      {
        method: 'HEAD',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: `Basic ${btoa('admin:123456')}`,
        },
        servername: 'test.com',
        uri: 'http://test.com:5984/medic/oops',
      }
    ]);
  });

  it('should use auth when both url auth and parameter are used', async () => {
    const opts = {
      url: 'http://a:b@test.com:5984/medic/omg',
      auth: { username: 'admin', password: '123456' },
    };

    await couchRequest.head(opts);

    expect(global.fetch.args[0]).to.deep.equal([
      'http://test.com:5984/medic/omg',
      {
        method: 'HEAD',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: `Basic ${btoa('admin:123456')}`,
        },
        servername: 'test.com',
        uri: 'http://test.com:5984/medic/omg',
      }
    ]);
  });

  it('should not add auth headers when no auth is present', async () => {
    await couchRequest.head({  url: 'http://test.com:5984/a' });

    expect(global.fetch.args[0]).to.deep.equal([
      'http://test.com:5984/a',
      {
        method: 'HEAD',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        servername: 'test.com',
        uri: 'http://test.com:5984/a',
      }
    ]);
  });

  it('should use authorization header', async () => {
    await couchRequest.post({
      url: 'http://a:b@marvel.net:5984/a',
      headers: { authorization: 'Bearer something' },
    });

    expect(global.fetch.args[0]).to.deep.equal([
      'http://marvel.net:5984/a',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          authorization: 'Bearer something',
        },
        servername: 'test.com',
        uri: 'http://marvel.net:5984/a',
      }
    ]);
  });

  it('should throw error when both options.auth and header is used', async () => {
    const opts = {
      url: 'http://a:b@marvel.net:5984/a',
      auth: { username: 'admin', password: '123456' },
      headers: { authorization: 'Bearer something' },
    };

    await expect(couchRequest.get(opts)).to.eventually.be.rejectedWith(
      'Conflicting authorization settings. Use authorization header or basic auth exclusively.'
    );
  });

  it('should copy all additional headers and params', async () => {
    await couchRequest.post({
      url: 'http://a:b@marvel.net:5984/a',
      foo: 'bar',
      headers: {
        'Content-Length': 100,

      },
    });
  });

  it('should make a json request without a body', async () => {
    global.fetch.resolves(buildResponse({ body: undefined }));

    await couchRequest.post({ url: 'http://test.com:5984/a' });

    expect(global.fetch.args[0]).to.deep.equal([
      'http://test.com:5984/a',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        servername: 'test.com',
        uri: 'http://test.com:5984/a',
      }
    ]);
  });

  it('should make json request with a body', async () => {
    const opts = {
      url: 'http://test.com:5984/b',
      body: { foo: 'bar' }
    };
    await couchRequest.post(opts);

    expect(global.fetch.args[0]).to.deep.equal([
      'http://test.com:5984/b',
      {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ foo: 'bar' }),
        servername: 'test.com',
        uri: 'http://test.com:5984/b',
      }
    ]);
  });

  it('should make form-data request with a body', async () => {
    const opts = {
      url: 'http://test.com:5984/b',
      form: { foo: 'bar', bar: 'baz' },
      json: false
    };
    await couchRequest.post(opts);

    expect(global.fetch.args[0]).to.deep.equal([
      'http://test.com:5984/b',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
        },
        body: 'foo=bar&bar=baz',
        servername: 'test.com',
        uri: 'http://test.com:5984/b',
      }
    ]);
  });

  it('should make form-data request with a json accepts', async () => {
    const opts = {
      url: 'http://test.com:5984/b',
      form: { foo: 'bar', bar: 'baz' },
      json: true
    };
    await couchRequest.post(opts);

    expect(global.fetch.args[0]).to.deep.equal([
      'http://test.com:5984/b',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/x-www-form-urlencoded',
          accept: 'application/json',
        },
        body: 'foo=bar&bar=baz',
        servername: 'test.com',
        uri: 'http://test.com:5984/b',
      }
    ]);
  });

  it('should make non-json request when specified', async () => {
    const opts = {
      url: 'http://test.com:5984/b',
      body: 'some random text',
      json: false
    };
    await couchRequest.post(opts);

    expect(global.fetch.args[0]).to.deep.equal([
      'http://test.com:5984/b',
      {
        method: 'POST',
        headers: {},
        body: 'some random text',
        servername: 'test.com',
        uri: 'http://test.com:5984/b',
      }
    ]);
  });

  it('should not make a json request when content type headers are set', async () => {
    const opts = {
      url: 'http://test.com:5984/b',
      body: 'some random text',
      headers: { 'content-type': 'text/html' },
    };
    await couchRequest.post(opts);

    expect(global.fetch.args[0]).to.deep.equal([
      'http://test.com:5984/b',
      {
        method: 'POST',
        headers: {
          'content-type': 'text/html',
        },
        body: 'some random text',
        servername: 'test.com',
        uri: 'http://test.com:5984/b',
      }
    ]);
  });

  it('should throw an error with incompatible json and content-type headers', async () => {
    const opts = {
      url: 'http://test.com:5984/b',
      body: 'some random text',
      json: true,
      headers: { 'content-type': 'text/html' },
    };
    await expect(couchRequest.post(opts)).to.eventually.be.rejectedWith(
      'Incompatible json and content-type properties.'
    );
  });

  it('should allow to send non-json and receive json', async () => {
    global.fetch.resolves(buildResponse({
      body: { foo: 'bar', bar: 'baz' },
      headers: new Headers({ 'content-type': 'application/json' }),
    }));

    const opts = {
      url: 'http://test.com:5984/b',
      body: 'some random text',
      json: false,
      headers: { 'content-type': 'text/html' },
    };

    const resp =  await couchRequest.post(opts);

    expect(resp).to.deep.equal({ foo: 'bar', bar: 'baz' });
    expect(response.text.called).to.equal(false);
    expect(response.json.called).to.equal(true);
  });

  it('should set a timeout', async () => {
    const opts = {
      url: 'http://test.com:5984/b',
      timeout: 5000,
    };
    await couchRequest.post(opts);

    expect(global.fetch.args[0]).to.deep.equal([
      'http://test.com:5984/b',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        servername: 'test.com',
        uri: 'http://test.com:5984/b',
        signal: AbortSignal.timeout(5000),
      }
    ]);
  });

  it('should add servername if not set', async () => {
    sinon.stub(process, 'env').value({
      ...process.env,
      COUCH_URL: 'http://admin:password@test.com:5984/medic',
      ADD_SERVERNAME_TO_HTTP_AGENT: true
    });
    couchRequest = rewire('../src/couch-request');

    await couchRequest.get({ url: 'http://test.com:5984/b' });

    expect(global.fetch.args[0]).to.deep.equal([
      'http://test.com:5984/b',
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        servername: 'test.com',
        uri: 'http://test.com:5984/b',
      }
    ]);
  });

  it('should not add servername if not set', async () => {
    sinon.stub(process, 'env').value({
      ...process.env,
      COUCH_URL: 'http://admin:password@test.com:5984/medic',
      ADD_SERVERNAME_TO_HTTP_AGENT: 'not true'
    });
    couchRequest = rewire('../src/couch-request');

    await couchRequest.get({ url: 'http://test.com:5984/b' });

    expect(global.fetch.args[0]).to.deep.equal([
      'http://test.com:5984/b',
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        uri: 'http://test.com:5984/b',
      }
    ]);
  });

  it('should return parsed json body', async () => {
    global.fetch.resolves(buildResponse({ body: { foo: 'bar', bar: 'baz' } }));

    const resp = await couchRequest.get({ url: 'http://test.com:5984/b' });
    expect(resp).to.deep.equal({ foo: 'bar', bar: 'baz' });
    expect(response.json.callCount).to.equal(1);
    expect(response.text.callCount).to.equal(0);
  });

  it('should return text body', async () => {
    global.fetch.resolves(buildResponse({ body: 'this is text', json: false }));
    const opts = {
      url: 'http://test.com:5984/b',
      json: false
    };
    const resp = await couchRequest.get(opts);
    expect(resp).to.deep.equal('this is text');
    expect(response.json.callCount).to.equal(0);
    expect(response.text.callCount).to.equal(1);
  });

  it('should optimistically try parsing json when sending json and no content-type header', async () => {
    global.fetch.resolves(buildResponse({
      body: JSON.stringify({ foo: 'bar', bar: 'baz' }),
      json: false,
    }));
    const opts = {
      url: 'http://test.com:5984/b',
      json: true
    };

    const resp = await couchRequest.get(opts);
    expect(resp).to.deep.equal({ foo: 'bar', bar: 'baz' });
    expect(response.json.callCount).to.equal(0);
    expect(response.text.callCount).to.equal(1);
  });

  it('should return unparsed content when optimistically returning json', async () => {
    global.fetch.resolves(buildResponse({
      body: 'text does not parse to json',
      json: false,
    }));
    const opts = {
      url: 'http://test.com:5984/b',
      json: true
    };

    const resp = await couchRequest.get(opts);
    expect(resp).to.deep.equal('text does not parse to json');
    expect(response.json.callCount).to.equal(0);
    expect(response.text.callCount).to.equal(1);
  });

  it('should return body on 3xx statuses', async () => {
    global.fetch.resolves(buildResponse({
      body: { foo: 'bar', bar: 'baz' },
      status: 301
    }));

    const resp = await couchRequest.get({ url: 'http://test.com:5984/b' });
    expect(resp).to.deep.equal({ foo: 'bar', bar: 'baz' });
  });

  it('should return whole response when requested ', async () => {
    global.fetch.resolves(buildResponse({
      body: 'this is text',
      status: 201,
      headers: new Headers({ foo: 'bar', bar: 'baz' }),
      streamed: true,
    }));

    const opts = {
      url: 'http://test.com:5984/b',
      simple: false,
    };

    const resp = await couchRequest.get(opts);
    expect(resp).to.deep.equal({
      ...response,
      body: 'this is text',
      status: 201,
      ok: true,
      headers: new Headers({ foo: 'bar', bar: 'baz', 'content-type': 'application/json' }),
      streamed: true,
    });
  });

  it('should throw error on non 2xx / 3xx statuses', async () => {
    global.fetch.resolves(buildResponse({
      body: { error: true, reason: 'conflict', status: 409 },
      status: 409,
      headers: new Headers({ foo: 'bar', bar: 'baz' }),
    }));

    try {
      await couchRequest.get({ url: 'http://test.com:5984/b' });
      expect.fail('should have thrown');
    } catch (error) {
      expect(error).to.deep.include({
        message: '409 - {"error":true,"reason":"conflict","status":409}',
        body: { error: true, reason: 'conflict', status: 409 },
        status: 409,
        ok: false,
        headers: new Headers({ foo: 'bar', bar: 'baz', 'content-type': 'application/json' }),
      });
    }
  });

  it('should not add request id header when async storage is not set', async () => {
    const response = await couchRequest.get({ uri: 'http://test.com:5984/test' });

    chai.expect(response).to.equal('yes');
    chai.expect(global.fetch.args).to.deep.equal([[
      'http://test.com:5984/test',
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        servername: 'test.com',
        uri: 'http://test.com:5984/test',
      }
    ]]);
  });


  it('should not add request id header when client request is not set', async () => {
    const asyncLocalStorage = {
      getRequestId: sinon.stub().returns(false),
      getRequest: sinon.stub().returns({ }),
    };
    couchRequest.setStore(asyncLocalStorage, 'header-name');

    const response = await couchRequest.get({ uri: 'http://test.com:5984/test' });

    chai.expect(response).to.equal('yes');
    chai.expect(global.fetch.args).to.deep.equal([[
      'http://test.com:5984/test',
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
        },
        servername: 'test.com',
        uri: 'http://test.com:5984/test',
      }
    ]]);
  });

  it('should set request id header when set', async () => {
    const asyncLocalStorage = {
      getRequestId: sinon.stub().returns('req_uuid'),
      getRequest: sinon.stub().returns({ requestId: 'req_uuid', user: 'test' }),
    };
    couchRequest.setStore(asyncLocalStorage, 'header-name');

    const resp = await couchRequest.get({ uri: 'http://test.com:5984/test' });
    chai.expect(resp).to.equal('yes');
    chai.expect(global.fetch.args).to.deep.equal([[
      'http://test.com:5984/test',
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'header-name': 'req_uuid'
        },
        servername: 'test.com',
        uri: 'http://test.com:5984/test',
      }
    ]]);

    expect(audit.fetchCallback.args).to.deep.equal([[
      'http://test.com:5984/test',
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'header-name': 'req_uuid'
        },
        servername: 'test.com',
        uri: 'http://test.com:5984/test',
      },
      {
        ...response,
        streamed: true,
        body: 'yes'
      },
      { requestId: 'req_uuid', user: 'test' },
    ]]);
  });

  it('should add request id header when headers are already set', async () => {
    const asyncLocalStorage = {
      getRequestId: sinon.stub().returns('req_uuid'),
      getRequest: sinon.stub().returns({ requestId: 'req_uuid', user: 'test' }),
    };
    couchRequest.setStore(asyncLocalStorage, 'header-name');

    const response = await couchRequest.get({ uri: 'http://test.com:5984/b', headers: { 'authorization': 'Basic 123' } });
    chai.expect(response).to.equal('yes');
    chai.expect(global.fetch.args).to.deep.equal([[
      'http://test.com:5984/b',
      {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'header-name': 'req_uuid',
          'authorization': 'Basic 123',
        },
        servername: 'test.com',
        uri: 'http://test.com:5984/b',
      }
    ]]);
  });
});
