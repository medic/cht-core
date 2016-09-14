describe('FacilityHierarchy service', function() {

  'use strict';

  var service,
      Facility;

  beforeEach(function() {
    module('inboxApp');
    Facility = sinon.stub();
    module(function ($provide) {
      $provide.value('Facility', Facility);
      $provide.factory('ContactSchema',
        function() {
          return {
            getTypes: function() { return [ 'district_hospital', 'health_center', 'clinic', 'person' ]; },
            getPlaceTypes: function() { return [ 'district_hospital', 'health_center', 'clinic' ]; }
          };
        }
      );
    });
    inject(function($injector) {
      service = $injector.get('FacilityHierarchy');
    });
  });

  afterEach(function() {
    KarmaUtils.restore(Facility);
  });

  it('returns errors from FacilityRaw service', function(done) {
    Facility.returns(KarmaUtils.mockPromise('boom'));
    service()
      .then(function() {
        done(new Error('error expected'));
      })
      .catch(function(err) {
        chai.expect(err).to.equal('boom');
        done();
      });
  });

  it('builds empty hierarchy when no facilities', function() {
    Facility.returns(KarmaUtils.mockPromise(null, []));
    return service().then(function(actual) {
      chai.expect(actual.length).to.equal(0);
    });
  });

  it('builds hierarchy for facilities', function() {
    var a = { _id: 'a', parent: { _id: 'b', parent: { _id: 'c' } } };
    var b = { _id: 'b', parent: { _id: 'c' } };
    var c = { _id: 'c' };
    var d = { _id: 'd', parent: { _id: 'b', parent: { _id: 'c' } } };
    var e = { _id: 'e', parent: { _id: 'x' } }; // unknown parent is ignored
    var f = { _id: 'f' };
    Facility.returns(KarmaUtils.mockPromise(null, [ a, b, c, d, e, f ]));
    return service().then(function(actual) {
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
    });
  });

});
