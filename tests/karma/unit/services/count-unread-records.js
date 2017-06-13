describe('CountUnreadRecords service', () => {

  'use strict';

  let service,
      query,
      allDocs;

  beforeEach(() => {
    query = sinon.stub();
    allDocs = sinon.stub();
    module('inboxApp');
    module($provide => {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.factory('DB', KarmaUtils.mockDB({ query: query, allDocs: allDocs }));
    });
    inject($injector => {
      service = $injector.get('CountUnreadRecords');
    });
  });

  it('returns zero when no messages', () => {
    query.returns(KarmaUtils.mockPromise(null, { rows: [] }));
    allDocs.returns(KarmaUtils.mockPromise(null, { rows: [] }));
    return service().then(actual => {
      chai.expect(actual).to.deep.equal({
        report: 0,
        message: 0
      });
    });
  });

  it('returns total', () => {
    query.returns(KarmaUtils.mockPromise(null, { rows: [
      { key: 'report', value: 13 },
      { key: 'message', value: 5 }
    ] }));
    allDocs.onCall(0).returns(KarmaUtils.mockPromise(null, { rows: [ {}, {}, {} ] }));
    allDocs.onCall(1).returns(KarmaUtils.mockPromise(null, { rows: [] }));
    return service().then(actual => {
      chai.expect(actual).to.deep.equal({
        report: 10,
        message: 5
      });
      chai.expect(query.callCount).to.equal(1);
      chai.expect(query.args[0][0]).to.equal('medic-client/data_records_read_by_type');
      chai.expect(query.args[0][1].group).to.equal(true);
      chai.expect(allDocs.callCount).to.equal(2);
      chai.expect(allDocs.args[0][0].startkey).to.equal('read:report:');
      chai.expect(allDocs.args[0][0].endkey).to.equal('read:report:\uFFFF');
      chai.expect(allDocs.args[1][0].startkey).to.equal('read:message:');
      chai.expect(allDocs.args[1][0].endkey).to.equal('read:message:\uFFFF');
    });
  });

});
