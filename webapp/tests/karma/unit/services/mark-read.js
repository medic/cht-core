describe('MarkRead service', () => {

  'use strict';

  let service;
  let db;
  let bulkDocs;

  beforeEach(() => {
    bulkDocs = sinon.stub();
    db = sinon.stub();
    db.returns({ bulkDocs: bulkDocs });
    module('inboxApp');
    module($provide => {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('DB', db);
      $provide.factory('Session', () => {
        return {
          userCtx: () => {
            return { name: 'james' };
          }
        };
      });
    });
    inject(_MarkRead_ => {
      service = _MarkRead_;
    });
  });

  afterEach(() => {
    KarmaUtils.restore(bulkDocs);
  });

  it('marks messages read', () => {
    const given = [ { _id: 'xyz' } ];
    const expected = [ { _id: 'read:message:xyz' } ];
    bulkDocs.returns(Promise.resolve());
    return service(given).then(() => {
      chai.expect(db.args[0][0].meta).to.equal(true);
      chai.expect(bulkDocs.args[0][0]).to.deep.equal(expected);
    });
  });

  it('marks reports read', () => {
    const given = [ { _id: 'xyz', form: 'P' } ];
    const expected = [ { _id: 'read:report:xyz' } ];
    bulkDocs.returns(Promise.resolve());
    return service(given).then(() => {
      chai.expect(db.args[0][0].meta).to.equal(true);
      chai.expect(bulkDocs.args[0][0]).to.deep.equal(expected);
    });
  });

  it('ignores conflicts when marking a document read thats already read', () => {
    const given = [ { _id: 'xyz' } ];
    const conflictResult = { ok: false, id: 'read:message:xyz', rev: '1' };
    bulkDocs.returns(Promise.resolve([ conflictResult ]));
    return service(given).then(() => {
      chai.expect(bulkDocs.callCount).to.equal(1);
    });
  });

  it('returns bulkDocs errors', done => {
    const given = { _id: 'xyz' };
    const expected = 'errcode2';
    bulkDocs.returns(Promise.reject(expected));
    service([given]).catch(err => {
      chai.expect(err).to.equal(expected);
      done();
    });
  });

  it('marks multiple docs read', () => {

    const given = [
      { _id: 'a' },
      { _id: 'b' }
    ];
    const expected = [
      { _id: 'read:message:a' },
      { _id: 'read:message:b' }
    ];

    bulkDocs.returns(Promise.resolve());

    return service(given).then(() => {
      chai.expect(bulkDocs.args[0][0]).to.deep.equal(expected);
    });
  });

});
