describe('GetSummaries service', () => {

  'use strict';

  let service;
  let getContactSummaries;
  let getReportSummaries;

  beforeEach(() => {
    getContactSummaries = sinon.stub();
    getReportSummaries = sinon.stub();

    const dataContext = {
      bind: sinon.stub()
        .onFirstCall().returns(getContactSummaries)
        .onSecondCall().returns(getReportSummaries),
    };

    module('adminApp');
    module($provide => {
      $provide.value('DataContext', Promise.resolve(dataContext));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
    });
    inject($injector => service = $injector.get('GetSummaries'));
  });

  it('returns empty array when given no ids', () => {
    return service().then(actual => {
      chai.expect(actual).to.deep.equal([]);
      chai.expect(getContactSummaries.callCount).to.equal(0);
      chai.expect(getReportSummaries.callCount).to.equal(0);
    });
  });

  it('returns empty array when given empty array', () => {
    return service([]).then(actual => {
      chai.expect(actual).to.deep.equal([]);
    });
  });

  it('merges contact and report summaries from the datasource', () => {
    const contactSummaries = [{ _id: 'a', name: 'james' }];
    const reportSummaries = [{ _id: 'b', form: 'delivery' }];
    getContactSummaries.resolves(contactSummaries);
    getReportSummaries.resolves(reportSummaries);

    return service([ 'a', 'b' ]).then(actual => {
      chai.expect(getContactSummaries.callCount).to.equal(1);
      chai.expect(getContactSummaries.args[0][0]).to.deep.equal([ 'a', 'b' ]);
      chai.expect(getReportSummaries.callCount).to.equal(1);
      chai.expect(getReportSummaries.args[0][0]).to.deep.equal([ 'a', 'b' ]);
      chai.expect(actual).to.deep.equal([
        { _id: 'a', name: 'james' },
        { _id: 'b', form: 'delivery' },
      ]);
    });
  });

});
