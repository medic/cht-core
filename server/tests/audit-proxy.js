var auditProxy = require('../audit-proxy.js');

exports['filter does not match request for different db'] = function(test) {
  var db = {
    name: '/kujua-lite'
  }
  var req = {
    url: '/somedb/do-something'
  };
  auditProxy.setup({db: db, audit: {}});
  test.equals(auditProxy.filter(req), false);
  test.done();
};

exports['filter does not match GET request'] = function(test) {
  var dbName = '/kujua-lite';
  var db = {
    name: dbName
  }
  var req = {
    url: dbName + '/do-something',
    method: 'GET'
  };
  auditProxy.setup({db: db, audit: {}});
  test.equals(auditProxy.filter(req), false);
  test.done();
};

exports['filter matches POST request'] = function(test) {
  var dbName = '/kujua-lite';
  var db = {
    name: dbName
  }
  var req = {
    url: dbName + '/do-something',
    method: 'POST'
  };
  auditProxy.setup({db: db, audit: {}});
  test.equals(auditProxy.filter(req), true);
  test.done();
};

exports['filter matches DELETE request'] = function(test) {
  var dbName = '/kujua-lite';
  var db = {
    name: dbName
  }
  var req = {
    url: dbName + '/do-something',
    method: 'DELETE'
  };
  auditProxy.setup({db: db, audit: {}});
  test.equals(auditProxy.filter(req), true);
  test.done();
};

exports['filter matches PUT request'] = function(test) {
  var dbName = '/kujua-lite';
  var db = {
    name: dbName
  }
  var req = {
    url: dbName + '/do-something',
    method: 'PUT'
  };
  auditProxy.setup({db: db, audit: {}});
  test.equals(auditProxy.filter(req), true);
  test.done();
};

exports['onMatch audits the request'] = function(test) {
  test.expect(4);
  var target = 'http://localhost:4444';
  var doc = {
    first: 'one',
    second: 'two'
  };
  var proxy = {
    web: function(req, res, options) {
      test.equals(target, options.target);
      test.equals('content-length', options.omitHeaders[0]);
    }
  };
  var audit = {
    log: function(docs, cb) {
      test.same(docs[0], doc);
      cb();
    }
  };
  var passStreamFn = function(writeFn, endFn) {
    var chunks = JSON.stringify(doc).match(/.{1,4}/g);
    chunks.forEach(function(chunk){
      writeFn(chunk, 'UTF-8', function() {});
    });
    endFn.call({push: function(body) {
      test.equals(body, JSON.stringify(doc));
    }}, function(err) {});
  };
  var req = {
    pipe: function(ps) {
      return {};
    }
  };
  auditProxy.setup({audit: audit, passStream: passStreamFn});
  auditProxy.onMatch(proxy, req, {}, target);
  test.done();
};

