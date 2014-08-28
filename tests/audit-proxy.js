var auditProxy = require('../audit-proxy.js'),
  events = require('events');

exports['onMatch audits the request'] = function(test) {
  test.expect(5);
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
    withNode: function(db, cb) {
      cb(function(err, _username) {
        test.same(username, _username);
      });
      return {
        log: function(docs, _cb) {
          test.same(docs[0], doc);
          docs[0]._id = generatedId;
          _cb();
        }
      }
    }
  };
  var proxy = {
    web: function(req, res, options) {
      test.equals(target, options.target);
      test.equals(
        Buffer.byteLength(JSON.stringify(auditedDoc)), 
        options.headers['content-length']
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
    pipe: function(ps) {
      return {};
    }
  };
  var db = {
    client: {
      host: 'localhost',
      port: 5984
    }
  };
  var res = new events.EventEmitter();
  var http = {
    get: function(options, cb) {
      cb(res);
      res.emit('data', '{"userCtx": {"name": "' + username + '"}}');
    }
  };
  auditProxy.setup({audit: audit, passStream: passStreamFn, db: db, http: http});
  auditProxy.onMatch(proxy, req, {}, target);
  test.done();
};


exports['onMatch does not audit non json request'] = function(test) {
  test.expect(2);
  var target = 'http://localhost:4444';
  var generatedId = 'abc';
  var username = 'steve';
  var doc = 'message_id=15095&sent_timestamp=1396224953456&message=ANCR+jessiec+18+18&from=%2B13125551212';
  var proxy = {
    web: function(req, res, options) {
      test.equals(target, options.target);
    }
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
      return {};
    }
  };

  auditProxy.setup({passStream: passStreamFn});
  auditProxy.onMatch(proxy, req, {}, target);
  test.done();
};

