const chai = require('chai'),
  AuditProxy = require('../../src/audit-proxy');

describe('audit proxy', () => {
  it('audit audits the request', done => {
    const target = 'http://localhost:4444';
    const generatedId = 'abc';
    const username = 'steve';
    const doc = {
      first: 'one',
      second: 'two',
    };
    const auditedDoc = {
      first: 'one',
      second: 'two',
      _id: generatedId,
    };
    const audit = {
      withNano: function(db, _db, _auditDb, _ddoc, _username) {
        chai.expect(username).to.equal(_username);
        chai.expect('medic').to.equal(_db);
        chai.expect('medic-audit').to.equal(_auditDb);
        chai.expect('medic').to.equal(_ddoc);
        return {
          log: function(docs, _cb) {
            chai.expect(docs[0]).to.deep.equal(doc);
            docs[0]._id = generatedId;
            _cb();
          },
        };
      },
    };
    const proxy = {
      web: function(req) {
        chai
          .expect(Buffer.byteLength(JSON.stringify(auditedDoc)))
          .to.equal(req.headers['content-length']);
      },
    };
    const passStreamFn = function(writeFn, endFn) {
      const chunks = JSON.stringify(doc).match(/.{1,4}/g);
      chunks.forEach(function(chunk) {
        writeFn(new Buffer(chunk), 'UTF-8', function() {});
      });
      endFn.call(
        {
          push: function(body) {
            chai.expect(body).to.deep.equal(JSON.stringify(auditedDoc));
          },
        },
        function() {}
      );
    };
    const req = {
      headers: {},
      pipe: function() {
        return { on: function() {} };
      },
    };
    const db = {
      client: {
        host: 'localhost',
        port: 5984,
      },
      settings: {
        db: 'medic',
        auditDb: 'medic-audit',
        ddoc: 'medic',
      },
    };
    const auth = {
      check: () => Promise.resolve({ user: username }),
    };
    const p = new AuditProxy();
    p.setup({ audit: audit, passStream: passStreamFn, db: db, auth: auth });
    p.audit(proxy, req, {}, target);
    done();
  });

  it('audit does not audit non json request', done => {
    const target = 'http://localhost:4444';
    const username = 'steve';
    const doc =
      'message_id=15095&sent_timestamp=1396224953456&message=ANCR+jessiec+18+18&from=%2B13125551212';
    const proxy = {
      web: function() {},
    };
    const passStreamFn = function(writeFn, endFn) {
      writeFn(new Buffer(doc), 'UTF-8', function() {});
      endFn.call(
        {
          push: function(body) {
            chai.expect(body.toString()).to.equal(doc);
          },
        },
        function() {}
      );
    };
    const req = {
      pipe: function() {
        return { on: function() {} };
      },
    };
    const auth = {
      check: () => Promise.resolve({ user: username }),
    };

    const p = new AuditProxy();
    p.setup({ passStream: passStreamFn, auth: auth });
    p.audit(proxy, req, {}, target);
    done();
  });

  it('audit does not audit _local docs', done => {
    const target = 'http://localhost:4444';
    const username = 'steve';
    const doc = JSON.stringify({
      docs: [
        {
          _id: '_local/9SJryf.JbGfRFek5agknAw==',
          _rev: '0-21',
          session_id: '2EC7B446-9868-5F5C-9B8B-6FE6C2DC6111',
          history: [
            {
              last_seq: 2221,
              session_id: '2EC7B446-9868-5F5C-9B8B-6FE6C2DC6111',
            },
          ],
        },
      ],
      new_edits: true,
    });
    const proxy = {
      web: function() {},
    };
    const passStreamFn = function(writeFn, endFn) {
      writeFn(new Buffer(doc), 'UTF-8', function() {});
      endFn.call(
        {
          push: function(body) {
            chai.expect(body.toString()).to.equal(doc);
          },
        },
        function() {}
      );
    };
    const req = {
      pipe: function() {
        return { on: function() {} };
      },
    };
    const auth = {
      check: () => Promise.resolve({ user: username }),
    };

    const p = new AuditProxy();
    p.setup({ passStream: passStreamFn, auth: auth });
    p.audit(proxy, req, {}, target);
    done();
  });

  it('audit audits the non _local docs', done => {
    const target = 'http://localhost:4444';
    const username = 'steve';
    const doc = {
      _id: 'abc',
      first: 'one',
      second: 'two',
    };
    const localDoc = {
      _id: '_local/9SJryf.JbGfRFek5agknAw==',
    };
    const docs = { docs: [localDoc, doc] };
    const audit = {
      withNano: function(db, _db, _auditDb, _ddoc, _username) {
        chai.expect(username).to.equal(_username);
        chai.expect('medic').to.equal(_db);
        chai.expect('medic-audit').to.equal(_auditDb);
        chai.expect('medic').to.equal(_ddoc);
        return {
          log: function(docs, _cb) {
            // only audit the proper doc
            chai.expect(docs.length).to.equal(1);
            chai.expect(docs[0]).to.deep.equal(doc);
            _cb();
          },
        };
      },
    };
    const proxy = {
      web: function(req) {
        chai
          .expect(Buffer.byteLength(JSON.stringify(docs)))
          .to.deep.equal(req.headers['content-length']);
      },
    };
    const passStreamFn = function(writeFn, endFn) {
      writeFn(new Buffer(JSON.stringify(docs)), 'UTF-8', function() {});
      endFn.call(
        {
          push: function(body) {
            // pass through both local and proper
            chai.expect(body).to.deep.equal(JSON.stringify(docs));
          },
        },
        function() {}
      );
    };
    const req = {
      headers: {},
      pipe: function() {
        return { on: function() {} };
      },
    };
    const db = {
      client: {
        host: 'localhost',
        port: 5984,
      },
      settings: {
        db: 'medic',
        auditDb: 'medic-audit',
        ddoc: 'medic',
      },
    };
    const auth = {
      check: () => Promise.resolve({ user: username }),
    };
    const p = new AuditProxy();
    p.setup({ audit: audit, passStream: passStreamFn, db: db, auth: auth });
    p.audit(proxy, req, {}, target);
    done();
  });

  it('audit emits error when not authorized', done => {
    const target = 'http://localhost:4444';
    const proxy = {};
    const req = {};
    const auth = {
      check: () => Promise.reject({ code: 401 }),
    };
    const p = new AuditProxy();
    p.setup({ auth: auth });
    p.on('not-authorized', function() {
      done();
    });
    p.audit(proxy, req, {}, target);
  });
});
