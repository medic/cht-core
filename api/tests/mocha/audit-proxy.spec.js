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
    const proxy = {
      web: function(req) {
        chai
          .expect(Buffer.byteLength(JSON.stringify(auditedDoc)))
          .to.equal(req.headers['content-length']);
      },
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
        ddoc: 'medic',
      },
    };
    const auth = {
      check: () => Promise.resolve({ user: username }),
    };
    const p = new AuditProxy();
    p.setup({ db: db, auth: auth });
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
