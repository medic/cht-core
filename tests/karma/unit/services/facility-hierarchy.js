describe('FacilityHierarchy service', function() {

  'use strict';

  var service,
      Facility;

  beforeEach(function() {
    module('inboxApp');
    Facility = sinon.stub();
    module(function ($provide) {
      $provide.value('Facility', Facility);
      $provide.value('PLACE_TYPES', [ 'district_hospital', 'health_center', 'clinic' ]);
    });
    inject(function($injector) {
      service = $injector.get('FacilityHierarchy');
    });
  });

  it('returns errors from FacilityRaw service', function(done) {
    Facility.returns(KarmaUtils.mockPromise('boom'));
    service(function(err) {
      chai.expect(err).to.equal('boom');
      done();
    });
  });

  it('builds empty hierarchy when no facilities', function(done) {
    Facility.returns(KarmaUtils.mockPromise(null, []));
    service(function(err, actual, actualTotal) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.length).to.equal(0);
      chai.expect(actualTotal).to.equal(0);
      done();
    });
  });

  it('builds hierarchy for facilities', function(done) {
    var a = { _id: 'a', parent: { _id: 'b', parent: { _id: 'c' } } };
    var b = { _id: 'b', parent: { _id: 'c' } };
    var c = { _id: 'c' };
    var d = { _id: 'd', parent: { _id: 'b', parent: { _id: 'c' } } };
    var e = { _id: 'e', parent: { _id: 'x' } }; // unknown parent is ignored
    var f = { _id: 'f' };
    Facility.returns(KarmaUtils.mockPromise(null, [ a, b, c, d, e, f ]));
    service(function(err, actual, actualTotal) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal([
        {
          doc: c,
          children: [
            {
              doc: b,
              children: [
                {
                  doc: a,
                  children: []
                },
                {
                  doc: d,
                  children: []
                }
              ]
            }
          ]
        },
        {
          doc: f,
          children: []
        }
      ]);
      chai.expect(actualTotal).to.equal(5);
      done();
    });
  });

});
