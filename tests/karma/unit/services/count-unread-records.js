describe('CountUnreadRecords service', () => {

  'use strict';

  let service,
      query;

  beforeEach(() => {
    query = sinon.stub();
    module('inboxApp');
    module($provide => {
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.factory('DB', KarmaUtils.mockDB({ query: query }));
    });
    inject($injector => {
      service = $injector.get('CountUnreadRecords');
    });
  });

  it('returns zero when no data_records', () => {
    query.returns(KarmaUtils.mockPromise(null, { rows: [] }));
    return service().then(actual => {
      chai.expect(actual).to.deep.equal({
        report: 0,
        message: 0
      });
    });
  });

  it('returns all data_records when none read', () => {
    query.onCall(0).returns(KarmaUtils.mockPromise(null, { rows: [
      { key: 'report', value: 13 },
      { key: 'message', value: 5 }
    ] }));
    query.onCall(1).returns(KarmaUtils.mockPromise(null, { rows: [] }));
    return service().then(actual => {
      chai.expect(actual).to.deep.equal({
        report: 13,
        message: 5
      });
    });
  });

  it('returns total', () => {
    query.onCall(0).returns(KarmaUtils.mockPromise(null, { rows: [
      { key: 'report', value: 13 },
      { key: 'message', value: 5 }
    ] }));
    query.onCall(1).returns(KarmaUtils.mockPromise(null, { rows: [
      { key: 'report', value: 3 }
    ] }));
    return service().then(actual => {
      chai.expect(actual).to.deep.equal({
        report: 10,
        message: 5
      });
      chai.expect(query.callCount).to.equal(2);
      chai.expect(query.args[0][0]).to.equal('medic-client/data_records_by_type');
      chai.expect(query.args[0][1].group).to.equal(true);
      chai.expect(query.args[1][0]).to.equal('medic-user/read');
      chai.expect(query.args[1][1].group).to.equal(true);
    });
  });

});
