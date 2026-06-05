describe('GetSummaries service', () => {

  'use strict';

  let service;
  let bind;
  let summariesFn;

  beforeEach(() => {
    summariesFn = sinon.stub();
    bind = sinon.stub().returns(summariesFn);

    const dataContext = { bind };

    module('adminApp');
    module($provide => {
      $provide.value('DataContext', Promise.resolve(dataContext));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject($injector => service = $injector.get('GetSummaries'));
  });

  describe('getContacts', () => {
    it('returns empty array when given no ids', () => {
      return service.getContacts().then(actual => {
        chai.expect(actual).to.deep.equal([]);
        chai.expect(bind.callCount).to.equal(0);
      });
    });

    it('returns empty array when given an empty array', () => {
      return service.getContacts([]).then(actual => {
        chai.expect(actual).to.deep.equal([]);
        chai.expect(bind.callCount).to.equal(0);
      });
    });

    it('loads summaries for the given ids', () => {
      const contactSummaries = [{ _id: 'a', name: 'james' }];
      summariesFn.resolves(contactSummaries);

      return service.getContacts([ 'a', 'b' ]).then(actual => {
        chai.expect(bind.callCount).to.equal(1);
        chai.expect(summariesFn.calledOnceWithExactly({ uuids: [ 'a', 'b' ] })).to.equal(true);
        chai.expect(actual).to.deep.equal(contactSummaries);
      });
    });
  });

  describe('getReports', () => {
    it('returns empty array when given no ids', () => {
      return service.getReports().then(actual => {
        chai.expect(actual).to.deep.equal([]);
        chai.expect(bind.callCount).to.equal(0);
      });
    });

    it('returns empty array when given an empty array', () => {
      return service.getReports([]).then(actual => {
        chai.expect(actual).to.deep.equal([]);
        chai.expect(bind.callCount).to.equal(0);
      });
    });

    it('loads summaries for the given ids', () => {
      const reportSummaries = [{ _id: 'b', form: 'delivery' }];
      summariesFn.resolves(reportSummaries);

      return service.getReports([ 'a', 'b' ]).then(actual => {
        chai.expect(bind.callCount).to.equal(1);
        chai.expect(summariesFn.calledOnceWithExactly({ uuids: [ 'a', 'b' ] })).to.equal(true);
        chai.expect(actual).to.deep.equal(reportSummaries);
      });
    });
  });

  it('binds a different datasource function for contacts than for reports', () => {
    summariesFn.resolves([]);

    return service.getContacts([ 'a' ])
      .then(() => service.getReports([ 'b' ]))
      .then(() => {
        chai.expect(bind.callCount).to.equal(2);
        chai.expect(bind.firstCall.args[0]).to.be.a('function');
        chai.expect(bind.secondCall.args[0]).to.be.a('function');
        chai.expect(bind.firstCall.args[0]).to.not.equal(bind.secondCall.args[0]);
      });
  });

});
