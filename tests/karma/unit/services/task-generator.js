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
    var calculateDate = function(registration, days) {
      return moment(registration.reported_date)
        .subtract(registration.fields.last_menstrual_period, 'weeks')
        .add(days, 'days')
        .toISOString();
    };
    var registrations = [
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
        reported_date: 1437820272360,
        fields: {
          patient_name: 'sally',
          last_menstrual_period: 20
        }
      }
    ];
    Search.callsArgWith(2, null, registrations);
    service().then(function(actual) {
      chai.expect(Search.callCount).to.equal(1);
      chai.expect(actual.length).to.equal(8);
      for (var registrationId = 1; registrationId <= 2; registrationId++) {
        for (var visitId = 1; visitId <= 4; visitId++) {
          var taskId = registrationId + '-' + visitId;
          var task = _.findWhere(actual, { _id: taskId });
          var registration = _.findWhere(registrations, { _id: registrationId });
          chai.expect(task.type).to.equal('visit');
          chai.expect(task.date).to.equal(calculateDate(registration, 50 * visitId));
          chai.expect(task.title.en).to.equal('ANC visit #' + visitId + ' for {{doc.fields.patient_name}}');
          chai.expect(task.fields[0].label.en).to.equal('Description');
          chai.expect(task.fields[0].value.en).to.equal('Please visit {{doc.fields.patient_name}} in Harrisa Village and refer her for ANC visit #' + visitId + '. Remember to check for danger signs!');
          chai.expect(task.doc._id).to.equal(registrationId);
        }
      }
      done();
    }).catch(function(err) {
      console.error(err);
    });
  });
});