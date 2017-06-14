describe('MarkRead service', () => {

  'use strict';

  let service,
      bulkDocs;

  beforeEach(() => {
    bulkDocs = sinon.stub();
    module('inboxApp');
    module($provide => {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.factory('DB', KarmaUtils.mockDB({ bulkDocs: bulkDocs }));
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

  it('marks the message read', () => {
    const given = [ { _id: 'xyz' } ];
    const expected = [ { _id: 'xyz', read: [ 'james' ] } ];
    bulkDocs.returns(KarmaUtils.mockPromise());
    return service(given).then(() => {
      chai.expect(bulkDocs.args[0][0]).to.deep.equal(expected);
    });
  });

  it('marks the message read when already read', () => {
    const given = [ { _id: 'xyz', read: [ 'james' ] } ];
    return service(given).then(() => {
      chai.expect(bulkDocs.callCount).to.equal(0);
    });
  });

  it('returns bulkDocs errors', done => {
    const given = { _id: 'xyz' };
    const expected = 'errcode2';
    bulkDocs.returns(KarmaUtils.mockPromise(expected));
    service([given]).catch(err => {
      chai.expect(err).to.equal(expected);
      done();
    });
  });

  it('marks multiple docs read', () => {

    const given = [
      { _id: 'a' },
      { _id: 'b', read: [ 'james' ] },
      { _id: 'c', read: [ 'jack' ] }
    ];
    const expected = [
      { _id: 'a', read: [ 'james' ] },
      { _id: 'c', read: [ 'jack', 'james' ] }
    ];

    bulkDocs.returns(KarmaUtils.mockPromise());

    return service(given).then(() => {
      chai.expect(bulkDocs.args[0][0]).to.deep.equal(expected);
    });
  });

});
