describe('TaskGenerator service', function() {

  'use strict';

  var service,
      Search;

  beforeEach(function() {
    Search = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.value('Search', Search);
    });
    inject(function($injector) {
      service = $injector.get('TaskGenerator');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(Search);
  });

  it('returns search errors', function(done) {
    Search.callsArgWith(2, 'boom');
    service().catch(function(err) {
      chai.expect(err).to.equal('boom');
      chai.expect(Search.callCount).to.equal(1);
      done();
    });
  });

  it('returns empty when search returns no documents', function(done) {
    Search.callsArgWith(2, null, []);
    service().then(function(actual) {
      chai.expect(Search.callCount).to.equal(1);
      chai.expect(actual).to.deep.equal([]);
      done();
    });
  });

  it('generates tasks when given docs', function(done) {
    Search.callsArgWith(2, null, [
      {
        _id: 1,
        reported_date: 1437618272360,
        fields: {
          patient_name: 'jenny',
          last_menstrual_period: 10
        }
      },
      {
        _id: 2,
        reported_date: 1437620272360,
        fields: {
          patient_name: 'sally',
          last_menstrual_period: 20
        }
      }
    ]);
    var expected = [
      {
        _id: '2-1',
        date: '2015-04-24T02:57:52.360Z',
        title: 'ANC visit #1 for sally',
        description: 'Please visit sally in Harrisa Village and refer her for ANC visit #1.',
        registration: {
          _id: 2,
          reported_date: 1437620272360,
          fields: {
            patient_name: 'sally',
            last_menstrual_period: 20
          }
        }
      },
      {
        _id: '2-2',
        date: '2015-06-13T02:57:52.360Z',
        title: 'ANC visit #2 for sally',
        description: 'Please visit sally in Harrisa Village and refer her for ANC visit #2.',
        registration: {
          _id: 2,
          reported_date: 1437620272360,
          fields: {
            patient_name: 'sally',
            last_menstrual_period: 20
          }
        }
      },
      {
        _id: '2-3',
        date: '2015-08-02T02:57:52.360Z',
        title: 'ANC visit #3 for sally',
        description: 'Please visit sally in Harrisa Village and refer her for ANC visit #3. Remember to check for danger signs!',
        registration: {
          _id: 2,
          reported_date: 1437620272360,
          fields: {
            patient_name: 'sally',
            last_menstrual_period: 20
          }
        }
      },
      {
        _id: '2-4',
        date: '2015-09-21T02:57:52.360Z',
        title: 'ANC visit #4 for sally',
        description: 'Please visit sally in Harrisa Village and refer her for ANC visit #4. Remember to check for danger signs!',
        registration: {
          _id: 2,
          reported_date: 1437620272360,
          fields: {
            patient_name: 'sally',
            last_menstrual_period: 20
          }
        }
      },
      {
        _id: '1-1',
        date: '2015-07-03T02:24:32.360Z',
        title: 'ANC visit #1 for jenny',
        description: 'Please visit jenny in Harrisa Village and refer her for ANC visit #1.',
        registration: {
          _id: 1,
          reported_date: 1437618272360,
          fields: {
            patient_name: 'jenny',
            last_menstrual_period: 10
          }
        }
      },
      {
        _id: '1-2',
        date: '2015-08-22T02:24:32.360Z',
        title: 'ANC visit #2 for jenny',
        description: 'Please visit jenny in Harrisa Village and refer her for ANC visit #2.',
        registration: {
          _id: 1,
          reported_date: 1437618272360,
          fields: {
            patient_name: 'jenny',
            last_menstrual_period: 10
          }
        }
      },
      {
        _id: '1-3',
        date: '2015-10-11T01:24:32.360Z',
        title: 'ANC visit #3 for jenny',
        description: 'Please visit jenny in Harrisa Village and refer her for ANC visit #3. Remember to check for danger signs!',
        registration: {
          _id: 1,
          reported_date: 1437618272360,
          fields: {
            patient_name: 'jenny',
            last_menstrual_period: 10
          }
        }
      },
      {
        _id: '1-4',
        date: '2015-11-30T01:24:32.360Z',
        title: 'ANC visit #4 for jenny',
        description: 'Please visit jenny in Harrisa Village and refer her for ANC visit #4. Remember to check for danger signs!',
        registration: {
          _id: 1,
          reported_date: 1437618272360,
          fields: {
            patient_name: 'jenny',
            last_menstrual_period: 10
          }
        }
      }
    ];
    service().then(function(actual) {
      chai.expect(Search.callCount).to.equal(1);
      chai.expect(JSON.stringify(actual)).to.equal(JSON.stringify(expected));
      done();
    });
  });
});