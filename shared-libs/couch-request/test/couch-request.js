const chai = require('chai').use(require('chai-as-promised'));
const request = require('request-promise-native');
const sinon = require('sinon');
const rewire = require('rewire');
chai.config.truncateThreshold = 0;

class Unicorn { }
const notPlainObjects = [
  [1, 2, 3], 
  new Unicorn(), 
  new Map([[1, 1], [2, 2], [3, 3]]), 
  new Set([1, 2, 3]),
  () => { }, 
  true,
  null, 
  1, 
  NaN, 
  Infinity, 
  /foo/, 
  new Date(),
  new Error(), 
  new Int8Array(), 
  new Float32Array(),
  new Float64Array(), 
  new Uint8Array(), 
  new Uint8ClampedArray(), 
  new Uint16Array(), 
  new Uint32Array(),
  new ArrayBuffer(), 
  new WeakMap(), 
  new WeakSet()
];
const notPlainObjectsWithString = notPlainObjects.concat(['foo']);
const optionsErrorMsg = '"options" must be a plain object';

describe('Couch request rejects non-plain objects', () => {
  let couchRequest;

  before(() => {
    sinon.stub(process, 'env').value({
      ...process.env,
      COUCH_URL: 'http://admin:password@test.com:5984/medic',
      ADD_SERVERNAME_TO_HTTP_AGENT: 'true' 
    });
    couchRequest = rewire('../src/couch-request');
  });

  notPlainObjectsWithString.forEach(notPlainObject => {
    if (typeof notPlainObject === 'undefined' || notPlainObject === null) {
      it(`Rejects notPlainObject as second arg (method: get): (string, notPlainObject == null)`, async () => {
        await chai.expect(couchRequest.get('string', notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });

      it(`Rejects notPlainObject as second arg (method: post): (notPlainObject == null)`, async () => {
        await chai.expect(couchRequest.post('string', notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });

      it(`Rejects notPlainObject as second arg (method: put): (notPlainObject == null)`, async () => {
        await chai.expect(couchRequest.put('string', notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });

      it(`Rejects notPlainObject as second arg (method: delete): (notPlainObject == null)`, async () => {
        await chai.expect(couchRequest.delete('string', notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });

      it(`Rejects notPlainObject as second arg (method: head): (notPlainObject == null)`, async () => {
        await chai.expect(couchRequest.head('string', notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });
    } else {
      const toString = `${notPlainObject.toString()}`;
      const result = toString === '' ? Object.getPrototypeOf(notPlainObject).constructor.name : toString;

      it(`Rejects notPlainObject as second arg (method: get): (string, ${result})`, async () => {
        await chai.expect(couchRequest.get('string', notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });

      it(`Rejects notPlainObject as second arg (method: post): ${result}`, async () => {
        await chai.expect(couchRequest.post('string', notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });

      it(`Rejects notPlainObject as second arg (method: put): ${result}`, async () => {
        await chai.expect(couchRequest.put('string', notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });
      it(`Rejects notPlainObject as second arg (method: delete): ${result}`, async () => {
        await chai.expect(couchRequest.delete('string', notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });
      it(`Rejects notPlainObject as second arg (method: head): ${result}`, async () => {
        await chai.expect(couchRequest.head('string', notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });
    }
  });

  notPlainObjects.forEach(notPlainObject => {
    if (typeof notPlainObject === 'undefined' || notPlainObject === null) {
      it(`Rejects notPlainObject as first arg (method: get): (notPlainObject == null)`, async () => {
        await chai.expect(couchRequest.get(notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });

      it(`Rejects notPlainObject as first arg (method: post): (notPlainObject == null)`, async () => {
        await chai.expect(couchRequest.post(notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });

      it(`Rejects notPlainObject as first arg (method: put): (notPlainObject == null)`, async () => {
        await chai.expect(couchRequest.put(notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });

      it(`Rejects notPlainObject as first arg (method: delete): (notPlainObject == null)`, async () => {
        await chai.expect(couchRequest.delete(notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });

      it(`Rejects notPlainObject as first arg (method: head): (notPlainObject == null)`, async () => {
        await chai.expect(couchRequest.head(notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });
    } else {
      const toString = `${notPlainObject.toString()}`;
      const result = toString === '' ? Object.getPrototypeOf(notPlainObject).constructor.name : toString;

      it(`Rejects notPlainObject as first arg (method: get): (${result})`, async () => {
        await chai.expect(couchRequest.get(notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });

      it(`Rejects notPlainObject as first arg (method: post): ${result}`, async () => {
        await chai.expect(couchRequest.post(notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });

      it(`Rejects notPlainObject as first arg (method: put): ${result}`, async () => {
        await chai.expect(couchRequest.put(notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });

      it(`Rejects notPlainObject as first arg (method: delete): ${result}`, async () => {
        await chai.expect(couchRequest.delete(notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });

      it(`Rejects notPlainObject as first arg (method: head): ${result}`, async () => {
        await chai.expect(couchRequest.head(notPlainObject))
          .to.eventually.be.rejectedWith(optionsErrorMsg)
          .and.be.an.instanceOf(Error);
      });
    }
  });
});

describe('Couch request with servername added receives correct options and returns stub value', () => {
  let couchRequest;

  before(() => {
    sinon.stub(process, 'env').value({
      ...process.env,
      COUCH_URL: 'http://admin:password@test.com:5984/medic',
      ADD_SERVERNAME_TO_HTTP_AGENT: 'true' 
    });
    couchRequest = rewire('../src/couch-request');
  });

  afterEach(() => {
    sinon.restore();
  });

  const options = [
    {
      foo: 'bar',
      url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
      uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
      method: 'GET' // Should not be passed to options
    },
    {
      foo: 'bar',
      url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
      uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
      method: 'GET', // Should not be passed to options
      headers: { 'Accepts': 'application/json, text/plain, */*' },
    },
  ];

  options.forEach(option => {
    
    it(`Get: Called with composite options and returns 'get'`, async () => {
      sinon.stub(request, 'get').resolves('get');
      const result = await couchRequest.get(option);

      chai.expect(request.get.args).to.deep.equal([[{
        servername: 'test.com',
        foo: 'bar',
        url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
        uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
        ...(option.headers && { headers: option.headers }),
      }]]);
      chai.expect(result).to.equal('get');
    });

    it(`Get: Called with url as first parameter and composite options and returns 'get'`, async () => {
      sinon.stub(request, 'get').resolves('get');
      const result = await couchRequest.get('a-test-url', option);
      chai.expect(request.get.args).to.deep.equal([[
        'a-test-url',
        {
          servername: 'test.com',
          foo: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('get');
    });

    it(`Post: Called with composite options and returns 'post'`, async () => {
      sinon.stub(request, 'post').resolves('post');
      const result = await couchRequest.post(option);

      chai.expect(request.post.args).to.deep.equal([[
        {
          servername: 'test.com',
          foo: 'bar',
          url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
          uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);

      chai.expect(result).to.equal('post');
    });

    it(`Post: Called with url as first parameter and composite options and returns 'post'`, async () => {
      sinon.stub(request, 'post').resolves('post');
      const result = await couchRequest.post('a-test-url', option);

      chai.expect(request.post.args).to.deep.equal([[
        'a-test-url',
        {
          servername: 'test.com',
          foo: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);

      chai.expect(result).to.equal('post');
    });

    it(`Head: Called with composite options and returns 'head'`, async () => {
      sinon.stub(request, 'head').resolves('head');
      const result = await couchRequest.head(option);

      chai.expect(request.head.args).to.deep.equal([[
        {
          servername: 'test.com',
          foo: 'bar',
          url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
          uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('head');
    });

    it(`Head: Called with url as first parameter and composite options and returns 'head'`, async () => {
      sinon.stub(request, 'head').resolves('head');

      const result = await couchRequest.head('a-test-url', option);

      chai.expect(request.head.args).to.deep.equal([[
        'a-test-url',
        {
          servername: 'test.com',
          foo: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('head');
    });

    it(`Delete: Called with composite options and returns 'delete'`, async () => {
      sinon.stub(request, 'delete').resolves('delete');

      const result = await couchRequest.delete(option);

      chai.expect(request.delete.args).to.deep.equal([[
        {
          servername: 'test.com',
          foo: 'bar',
          url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
          uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('delete');
    });

    it(`Delete: Called with url as first parameter and composite options and returns 'delete'`, async () =>  {
      sinon.stub(request, 'delete').resolves('delete');

      const result = await couchRequest.delete('a-test-url', option);

      chai.expect(request.delete.args).to.deep.equal([[
        'a-test-url',
        {
          servername: 'test.com',
          foo: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);

      chai.expect(result).to.equal('delete');
    });

    it(`Put: Called with composite options and returns 'put'`, async () => {
      sinon.stub(request, 'put').resolves('put');

      const result = await couchRequest.put(option);

      chai.expect(request.put.args).to.deep.equal([[
        {
          servername: 'test.com',
          foo: 'bar',
          url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
          uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('put');
    });

    it(`Put: Called with url as first parameter and composite options and returns 'put'`, async () => {
      sinon.stub(request, 'put').resolves('put');

      const result = await couchRequest.put('a-test-url', option);

      chai.expect(request.put.args).to.deep.equal([[
        'a-test-url',
        {
          servername: 'test.com',
          foo: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('put');
    });
  });

  const overrideOptions = [
    {
      foo: 'bar',
      servername: 'bar',
    },
    {
      foo: 'bar',
      servername: 'bar',
      headers: { 'Accepts': 'application/json, text/plain, */*' },
    }
  ];
  
  overrideOptions.forEach(option => {

    it(`Get: Called with options overridden and returns 'get'`, async () => {
      sinon.stub(request, 'get').resolves('get');

      const result = await couchRequest.get(option);

      chai.expect(request.get.args).to.deep.equal([[
        {
          servername: 'bar',
          foo: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);

      chai.expect(result).to.equal('get');
    });
    
    it(`Get: Called with url in first param and options overridden and returns 'get'`, async () => {
      sinon.stub(request, 'get').resolves('get');
      
      const result = await couchRequest.get('a-test-url', option);

      chai.expect(request.get.args).to.deep.equal([[
        'a-test-url',
        {
          servername: 'bar',
          foo: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('get');
    });

    it(`Post: Called with options overridden and returns 'post'`, async () => {
      sinon.stub(request, 'post').resolves('post');

      const result = await couchRequest.post(option);

      chai.expect(request.post.args).to.deep.equal([[
        {
          servername: 'bar',
          foo: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('post');
    });

    it(`Post: Called with url in first param and options overridden and returns 'post'`, async () => {
      sinon.stub(request, 'post').resolves('post');

      const result = await couchRequest.post('a-test-url', option);

      chai.expect(request.post.args).to.deep.equal([[
        'a-test-url',
        {
          servername: 'bar',
          foo: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('post');
    });

    it(`Head: Called with options overridden and returns 'head'`, async () => {
      sinon.stub(request, 'head').resolves('head');

      const result = await couchRequest.head(option);

      chai.expect(request.head.args).to.deep.equal([[
        {
          servername: 'bar',
          foo: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);

      chai.expect(result).to.equal('head');
    });

    it(`Head: Called with url in first param and options overridden and returns 'head'`, async () => {
      sinon.stub(request, 'head').resolves('head');

      const result = await couchRequest.head('a-test-url', option);

      chai.expect(request.head.args).to.deep.equal([[
        'a-test-url',
        {
          servername: 'bar',
          foo: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('head');
    });

    it(`Delete: Called with options overridden and returns 'delete'`, async () => {
      sinon.stub(request, 'delete').resolves('delete');

      const result = await couchRequest.delete(option);

      chai.expect(request.delete.args).to.deep.equal([[
        {
          servername: 'bar',
          foo: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);

      chai.expect(result).to.equal('delete');
    });

    it(`Delete: Called with url in first param and options overridden and returns 'delete'`, async () => {
      sinon.stub(request, 'delete').resolves('delete');

      const result = await couchRequest.delete('a-test-url', option);

      chai.expect(request.delete.args).to.deep.equal([[
        'a-test-url',
        {
          servername: 'bar',
          foo: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('delete');
    });

    it(`Put: Called with options overridden and returns 'put'`, async () => {
      sinon.stub(request, 'put').resolves('put');

      const result = await couchRequest.put(option);

      chai.expect(request.put.args).to.deep.equal([[
        {
          servername: 'bar',
          foo: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('put');
    });

    it(`Put: Called with url in first param and options overridden and returns 'put'`, async () => {
      sinon.stub(request, 'put').resolves('put');

      const result = await couchRequest.put('a-test-url', option);

      chai.expect(request.put.args).to.deep.equal([[
        'a-test-url',
        {
          servername: 'bar',
          foo: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('put');
    });
  });
});

describe('Couch request with default servername omitted receives correct options and returns stub value', () => {

  let couchRequest;

  before(() => {
    sinon.stub(process, 'env').value({
      ...process.env,
      COUCH_URL: 'http://admin:password@test.com:5984/medic',
      ADD_SERVERNAME_TO_HTTP_AGENT: 'false' 
    });
    couchRequest = rewire('../src/couch-request');
  });

  afterEach(() => {
    sinon.restore();
  });

  const options = [
    {
      foo: 'bar',
      url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
      uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
      method: 'GET' // Should not be passed to options
    },
    {
      foo: 'bar',
      url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
      uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
      method: 'GET', // Should not be passed to options
      headers: { 'Authorization': 'Basic 123' },
    },
  ];

  options.forEach(option => {
    
    it(`Get: Called with composite options and returns 'get'`, async () => {
      sinon.stub(request, 'get').resolves('get');

      const result = await couchRequest.get(option);

      chai.expect(request.get.args).to.deep.equal([[
        {
          foo: 'bar',
          url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
          uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);

      chai.expect(result).to.equal('get');
    });

    it(`Post: Called with composite options and returns 'post'`, async () => {
      sinon.stub(request, 'post').resolves('post');

      const result = await couchRequest.post(option);

      chai.expect(request.post.args).to.deep.equal([[
        {
          foo: 'bar',
          url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
          uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('post');
    });

    it(`Head: Called with url as first parameter and composite options and returns 'head'`, async () => {
      sinon.stub(request, 'head').resolves('head');

      const result = await couchRequest.head('a-test-url', option);

      chai.expect(request.head.args).to.deep.equal([[
        'a-test-url',
        {
          foo: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);

      chai.expect(result).to.equal('head');
    });

    it(`Delete: Called with url as first parameter and composite options and returns 'delete'`, async () => {
      sinon.stub(request, 'delete').resolves('delete');

      const result = await couchRequest.delete('a-test-url', option);

      chai.expect(request.delete.args).to.deep.equal([[
        'a-test-url',
        {
          foo: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('delete');
    });

    it(`Put: Called with composite options and returns 'put'`, async () => {
      sinon.stub(request, 'put').resolves('put');

      const result = await couchRequest.put(option);

      chai.expect(request.put.args).to.deep.equal([[
        {
          foo: 'bar',
          url: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
          uri: 'shouldBeOverriddenWhenFirstParamIsAStringOnly',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);

      chai.expect(result).to.equal('put');
    });
  });

  const overrideOptions = [
    {
      foo: 'bar',
      servername: 'bar',
    },
    {
      foo: 'bar',
      servername: 'bar',
      headers: { 'Authorization': 'Basic 123' },
    },
  ];
  
  overrideOptions.forEach(option => {

    it(`Get: Called with url in first param and options overridden,
     servername allowed as optional override and returns 'get'`, async () => {
      sinon.stub(request, 'get').resolves('get');

      const result = await couchRequest.get('a-test-url', option);

      chai.expect(request.get.args).to.deep.equal([[
        'a-test-url',
        {
          foo: 'bar',
          servername: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('get');
    });

    it(`Post: Called with options overridden,
      servername allowed as optional override and returns 'post'`, async () => {
      sinon.stub(request, 'post').resolves('post');

      const result = await couchRequest.post(option);

      chai.expect(request.post.args).to.deep.equal([[
        {
          foo: 'bar',
          servername: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('post');
    });

    it(`Head: Called with url in first param and options overridden,
     servername allowed as optional override and returns 'head'`, async () => {
      sinon.stub(request, 'head').resolves('head');

      const result = await couchRequest.head('a-test-url', option);

      chai.expect(request.head.args).to.deep.equal([[
        'a-test-url',
        {
          foo: 'bar',
          servername: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('head');
    });

    it(`Delete: Called with options overridden,
     servername allowed as optional override and returns 'delete'`, async () => {
      sinon.stub(request, 'delete').resolves('delete');

      const result = await couchRequest.delete(option);

      chai.expect(request.delete.args).to.deep.equal([[
        {
          foo: 'bar',
          servername: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('delete');
    });

    it(`Put: Called with url in first param and options overridden,
     servername allowed as optional override and returns 'put'`, async () => {
      sinon.stub(request, 'put').resolves('put');

      const result = await couchRequest.put('a-test-url', option);
      chai.expect(request.put.args).to.deep.equal([[
        'a-test-url',
        {
          foo: 'bar',
          servername: 'bar',
          ...(option.headers && { headers: option.headers }),
        }
      ]]);
      chai.expect(result).to.equal('put');
    });
  });
});

describe('request id header', () => {
  let couchRequest;

  before(() => {
    sinon.stub(process, 'env').value({
      ...process.env,
      COUCH_URL: 'http://admin:password@test.com:5984/medic',
      ADD_SERVERNAME_TO_HTTP_AGENT: 'true'
    });
    couchRequest = rewire('../src/couch-request');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should not add request id header when async storage is not set', async () => {
    sinon.stub(request, 'get').resolves('got');

    const response = await couchRequest.get('foobar');

    chai.expect(response).to.equal('got');
    chai.expect(request.get.args).to.deep.equal([[
      'foobar',
      {
        servername: 'test.com',
      }
    ]]);
  });


  it('should not add request id header when client request is not set', async () => {
    sinon.stub(request, 'get').resolves('got');
    const asyncLocalStorage = { getRequestId: sinon.stub().returns(false) };
    couchRequest.initialize(asyncLocalStorage, 'header-name');

    const response = await couchRequest.get('foobar');

    chai.expect(response).to.equal('got');
    chai.expect(request.get.args).to.deep.equal([[
      'foobar',
      {
        servername: 'test.com',
      }
    ]]);
  });

  it('should set request id header when set', async () => {
    sinon.stub(request, 'get').resolves('got');
    const asyncLocalStorage = { getRequestId: sinon.stub().returns('req_uuid') };
    couchRequest.initialize(asyncLocalStorage, 'header-name');

    const response = await couchRequest.get('foobar');
    chai.expect(response).to.equal('got');
    chai.expect(request.get.args).to.deep.equal([[
      'foobar',
      {
        servername: 'test.com',
        headers: { 'header-name': 'req_uuid' }
      }
    ]]);
  });

  it('should add request id header when headers are already set', async () => {
    sinon.stub(request, 'get').resolves('got');
    const asyncLocalStorage = { getRequestId: sinon.stub().returns('req_uuid') };
    couchRequest.initialize(asyncLocalStorage, 'header-name');

    const response = await couchRequest.get('foobar', { headers: { 'Authorization': 'Basic 123' } });
    chai.expect(response).to.equal('got');
    chai.expect(request.get.args).to.deep.equal([[
      'foobar',
      {
        servername: 'test.com',
        headers: {
          'header-name': 'req_uuid',
          'Authorization': 'Basic 123',
        }
      }
    ]]);
  });
});
