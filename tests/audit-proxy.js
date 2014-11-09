var AuditProxy = require('../audit-proxy');

exports['audit audits the request'] = function(test) {
  test.expect(4);
  var target = 'http://localhost:4444';
  var generatedId = 'abc';
  var username = 'steve';
  var doc = {
    first: 'one',
    second: 'two'
  };
  var auditedDoc = {
    first: 'one',
    second: 'two',
    _id: generatedId
  };
  var audit = {
    withNode: function(db, _username) {
      test.same(username, _username);
      return {
        log: function(docs, _cb) {
          test.same(docs[0], doc);
          docs[0]._id = generatedId;
          _cb();
        }
      };
    }
  };
  var proxy = {
    web: function(req, res, options) {
      test.equals(
        Buffer.byteLength(JSON.stringify(auditedDoc)),
        req.headers['content-length']
      );
    }
  };
  var passStreamFn = function(writeFn, endFn) {
    var chunks = JSON.stringify(doc).match(/.{1,4}/g);
    chunks.forEach(function(chunk){
      writeFn(chunk, 'UTF-8', function() {});
    });
    endFn.call({push: function(body) {
      test.equals(body, JSON.stringify(auditedDoc));
    }}, function(err) {});
  };
  var req = {
    headers: {},
    pipe: function(ps) {
      return { on: function(eventName, callback) {} };
    }
  };
  var db = {
    client: {
      host: 'localhost',
      port: 5984
    }
  };
  var auth = {
    getUserCtx: function(req, cb) {
      cb(null, { name: username });
    }
  };
  var p = new AuditProxy();
  p.setup({ audit: audit, passStream: passStreamFn, db: db, auth: auth });
  p.audit(proxy, req, {}, target);
  test.done();
};

exports['audit does not audit non json request'] = function(test) {
  test.expect(1);
  var target = 'http://localhost:4444';
  var username = 'steve';
  var doc = 'message_id=15095&sent_timestamp=1396224953456&message=ANCR+jessiec+18+18&from=%2B13125551212';
  var proxy = {
    web: function(req, res, options) {}
  };
  var passStreamFn = function(writeFn, endFn) {
    var chunks = doc.match(/.{1,4}/g);
    chunks.forEach(function(chunk){
      writeFn(chunk, 'UTF-8', function() {});
    });
    endFn.call({push: function(body) {
      test.equals(body, doc);
    }}, function(err) {});
  };
  var req = {
    pipe: function(ps) {
      return { on: function(eventName, callback) {} };
    }
  };
  var auth = {
    getUserCtx: function(req, cb) {
      cb(null, { name: username });
    }
  };

  var p = new AuditProxy();
  p.setup({ passStream: passStreamFn, auth: auth });
  p.audit(proxy, req, {}, target);
  test.done();
};

exports['audit emits error when not authorized'] = function(test) {
  test.expect(0);
  var target = 'http://localhost:4444';
  var proxy = {};
  var req = {};
  var auth = {
    getUserCtx: function(req, cb) {
      cb('Not logged in');
    }
  };
  var p = new AuditProxy();
  p.setup({ auth: auth });
  p.on('not-authorized', function() {
    test.done();
  });
  p.audit(proxy, req, {}, target);
};

exports['audit emits errors when stream emits errors'] = function(test) {
  test.expect(2);
  var target = 'http://localhost:4444';
  var generatedId = 'abc';
  var username = 'steve';
  var doc = {
    first: 'one',
    second: 'two'
  };
  var auditedDoc = {
    first: 'one',
    second: 'two',
    _id: generatedId
  };
  var audit = {
    withNode: function(db, _username) {
      test.same(username, _username);
      return {
        log: function(docs, _cb) {
          _cb('SOME ERROR');
        }
      };
    }
  };
  var proxy = {
    web: function(req, res, options) {
      test.equals(
        Buffer.byteLength(JSON.stringify(auditedDoc)),
        req.headers['content-length']
      );
    }
  };
  var writeFn,
      endFn;
  var passStreamFn = function(_writeFn, _endFn) {
    writeFn = _writeFn;
    endFn = _endFn;
  };
  var req = {
    headers: {},
    pipe: function(ps) {
      return {
        on: function(eventName, callback) {
          if (eventName === 'error') {
            var chunks = JSON.stringify(doc).match(/.{1,4}/g);
            chunks.forEach(function(chunk){
              writeFn(chunk, 'UTF-8', function() {});
            });
            endFn.call({push: function(body) {
              test.equals(body, JSON.stringify(auditedDoc));
            }}, function(err) {
              if (err) {
                callback(err);
              }
            });
          }
        }
      };
    }
  };
  var db = {
    client: {
      host: 'localhost',
      port: 5984
    }
  };
  var auth = {
    getUserCtx: function(req, cb) {
      cb(null, { name: username });
    }
  };
  var p = new AuditProxy();
  p.setup({ audit: audit, passStream: passStreamFn, db: db, auth: auth });
  p.on('error', function(err) {
    test.equals(err, 'SOME ERROR');
    test.done();
  });
  p.audit(proxy, req, {}, target);
};