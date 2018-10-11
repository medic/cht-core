const AuditProxy = require('../../src/audit-proxy');

describe('audit proxy', () => {
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
