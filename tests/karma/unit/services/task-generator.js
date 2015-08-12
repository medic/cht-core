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
    }).catch(function(err) {
      console.error(err);
    });
  });

  it('generates tasks when given registrations', function(done) {
    var registration1 = {
      _id: 1,
      reported_date: 1437618272360,
      fields: {
        patient_name: 'jenny',
        last_menstrual_period: 10
      }
    };
    var registration2 = {
      _id: 2,
      reported_date: 1437820272360,
      fields: {
        patient_name: 'sally',
        last_menstrual_period: 20
      }
    };
    var calculateDate = function(registration, days) {
      return moment(registration.reported_date)
        .subtract(registration.fields.last_menstrual_period, 'weeks')
        .add(days, 'days')
        .toISOString();
    };
    Search.callsArgWith(2, null, [ registration1, registration2 ]);
    var expected = [
      {
        _id: '2-1',
        date: calculateDate(registration2, 50),
        title: 'ANC visit #1 for sally',
        description: 'Please visit sally in Harrisa Village and refer her for ANC visit #1.',
        registration: registration2
      },
      {
        _id: '2-2',
        date: calculateDate(registration2, 100),
        title: 'ANC visit #2 for sally',
        description: 'Please visit sally in Harrisa Village and refer her for ANC visit #2.',
        registration: registration2
      },
      {
        _id: '2-3',
        date: calculateDate(registration2, 150),
        title: 'ANC visit #3 for sally',
        description: 'Please visit sally in Harrisa Village and refer her for ANC visit #3. Remember to check for danger signs!',
        registration: registration2
      },
      {
        _id: '2-4',
        date: calculateDate(registration2, 200),
        title: 'ANC visit #4 for sally',
        description: 'Please visit sally in Harrisa Village and refer her for ANC visit #4. Remember to check for danger signs!',
        registration: registration2
      },
      {
        _id: '1-1',
        date: calculateDate(registration1, 50),
        title: 'ANC visit #1 for jenny',
        description: 'Please visit jenny in Harrisa Village and refer her for ANC visit #1.',
        registration: registration1
      },
      {
        _id: '1-2',
        date: calculateDate(registration1, 100),
        title: 'ANC visit #2 for jenny',
        description: 'Please visit jenny in Harrisa Village and refer her for ANC visit #2.',
        registration: registration1
      },
      {
        _id: '1-3',
        date: calculateDate(registration1, 150),
        title: 'ANC visit #3 for jenny',
        description: 'Please visit jenny in Harrisa Village and refer her for ANC visit #3. Remember to check for danger signs!',
        registration: registration1
      },
      {
        _id: '1-4',
        date: calculateDate(registration1, 200),
        title: 'ANC visit #4 for jenny',
        description: 'Please visit jenny in Harrisa Village and refer her for ANC visit #4. Remember to check for danger signs!',
        registration: registration1
      }
    ];
    service().then(function(actual) {
      chai.expect(Search.callCount).to.equal(1);
      chai.expect(actual.length).to.equal(expected.length);
      for (var i = 0; i < actual.length; i++) {
        chai.expect(actual[i]._id).to.equal(expected[i]._id);
        chai.expect(actual[i].date).to.equal(expected[i].date);
        chai.expect(actual[i].title).to.equal(expected[i].title);
        chai.expect(actual[i].description).to.equal(expected[i].description);
        chai.expect(actual[i].registration._id).to.equal(expected[i].registration._id);
      }
      done();
    }).catch(function(err) {
      console.error(err);
    });
  });
});