var AuditProxy = require('../../audit-proxy');

exports['audit audits the request'] = function(test) {
  test.expect(7);
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
    withNano: function(db, _db, _auditDb, _ddoc, _username) {
      test.same(username, _username);
      test.same('medic', _db);
      test.same('medic-audit', _auditDb);
      test.same('medic', _ddoc);
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
    web: function(req) {
      test.equals(
        Buffer.byteLength(JSON.stringify(auditedDoc)),
        req.headers['content-length']
      );
    }
  };
  var passStreamFn = function(writeFn, endFn) {
    var chunks = JSON.stringify(doc).match(/.{1,4}/g);
    chunks.forEach(function(chunk){
      writeFn(new Buffer(chunk), 'UTF-8', function() {});
    });
    endFn.call({push: function(body) {
      test.equals(body, JSON.stringify(auditedDoc));
    }}, function() {});
  };
  var req = {
    headers: {},
    pipe: function() {
      return { on: function() {} };
    }
  };
  var db = {
    client: {
      host: 'localhost',
      port: 5984
    },
    settings: {
      db: 'medic',
      auditDb: 'medic-audit',
      ddoc: 'medic'
    }
  };
  var auth = {
    check: function(req, permission, district, cb) {
      cb(null, { user: username });
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
    web: function() {}
  };
  var passStreamFn = function(writeFn, endFn) {
    writeFn(new Buffer(doc), 'UTF-8', function() {});
    endFn.call({push: function(body) {
      test.equals(body, doc);
    }}, function() {});
  };
  var req = {
    pipe: function() {
      return { on: function() {} };
    }
  };
  var auth = {
    check: function(req, permission, district, cb) {
      cb(null, { user: username });
    }
  };

  var p = new AuditProxy();
  p.setup({ passStream: passStreamFn, auth: auth });
  p.audit(proxy, req, {}, target);
  test.done();
};

exports['audit does not audit _local docs'] = function(test) {
  test.expect(1);
  var target = 'http://localhost:4444';
  var username = 'steve';
  var doc = JSON.stringify({
    docs: [{
      _id: '_local/9SJryf.JbGfRFek5agknAw==',
      _rev: '0-21',
      session_id: '2EC7B446-9868-5F5C-9B8B-6FE6C2DC6111',
      history: [ { last_seq: 2221, session_id: '2EC7B446-9868-5F5C-9B8B-6FE6C2DC6111' } ]
    }],
    new_edits: true
  });
  var proxy = {
    web: function() {}
  };
  var passStreamFn = function(writeFn, endFn) {
    writeFn(new Buffer(doc), 'UTF-8', function() {});
    endFn.call({push: function(body) {
      test.equals(body, doc);
    }}, function() {});
  };
  var req = {
    pipe: function() {
      return { on: function() {} };
    }
  };
  var auth = {
    check: function(req, permission, district, cb) {
      cb(null, { user: username });
    }
  };

  var p = new AuditProxy();
  p.setup({ passStream: passStreamFn, auth: auth });
  p.audit(proxy, req, {}, target);
  test.done();
};


exports['audit audits the non _local docs'] = function(test) {
  test.expect(8);
  var target = 'http://localhost:4444';
  var username = 'steve';
  var doc = {
    _id: 'abc',
    first: 'one',
    second: 'two'
  };
  var localDoc = {
    _id: '_local/9SJryf.JbGfRFek5agknAw=='
  };
  var docs = { docs: [ localDoc, doc ] };
  var audit = {
    withNano: function(db, _db, _auditDb, _ddoc, _username) {
      test.same(username, _username);
      test.same('medic', _db);
      test.same('medic-audit', _auditDb);
      test.same('medic', _ddoc);
      return {
        log: function(docs, _cb) {
          // only audit the proper doc
          test.equals(docs.length, 1);
          test.same(docs[0], doc);
          _cb();
        }
      };
    }
  };
  var proxy = {
    web: function(req) {
      test.equals(
        Buffer.byteLength(JSON.stringify(docs)),
        req.headers['content-length']
      );
    }
  };
  var passStreamFn = function(writeFn, endFn) {
    writeFn(new Buffer(JSON.stringify(docs)), 'UTF-8', function() {});
    endFn.call({push: function(body) {
      // pass through both local and proper
      test.equals(body, JSON.stringify(docs));
    }}, function() {});
  };
  var req = {
    headers: {},
    pipe: function() {
      return { on: function() {} };
    }
  };
  var db = {
    client: {
      host: 'localhost',
      port: 5984
    },
    settings: {
      db: 'medic',
      auditDb: 'medic-audit',
      ddoc: 'medic'
    }
  };
  var auth = {
    check: function(req, permission, district, cb) {
      cb(null, { user: username });
    }
  };
  var p = new AuditProxy();
  p.setup({ audit: audit, passStream: passStreamFn, db: db, auth: auth });
  p.audit(proxy, req, {}, target);
  test.done();
};

exports['audit emits error when not authorized'] = function(test) {
  test.expect(0);
  var target = 'http://localhost:4444';
  var proxy = {};
  var req = {};
  var auth = {
    check: function(req, permission, district, cb) {
      cb({ code: 401 });
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
    withNano: function(db, _db, _auditDb, _ddoc, _username) {
      test.same(username, _username);
      return {
        log: function(docs, _cb) {
          _cb('SOME ERROR');
        }
      };
    }
  };
  var proxy = {
    web: function(req) {
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
    pipe: function() {
      return {
        on: function(eventName, callback) {
          if (eventName === 'error') {
            var chunks = JSON.stringify(doc).match(/.{1,4}/g);
            chunks.forEach(function(chunk){
              writeFn(new Buffer(chunk), 'UTF-8', function() {});
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
    },
    settings: {
      db: 'medic',
      ddoc: 'medic'
    }
  };
  var auth = {
    check: function(req, permission, district, cb) {
      cb(null, { user: username });
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
