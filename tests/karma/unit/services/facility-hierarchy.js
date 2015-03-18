describe('FacilityHierarchy service', function() {

  'use strict';

  var service,
      facilities,
      error;

  beforeEach(function() {
    module('inboxApp');
    module(function ($provide) {
      $provide.value('FacilityRaw', function() {
        return { query: function(cbRes, cbErr) {
          if (error) {
            return cbErr(error);
          }
          cbRes({ rows: facilities });
        } };
      });
    });
    inject(function($injector) {
      service = $injector.get('FacilityHierarchy');
    });
    facilities = null;
    error = null;
  });

  it('returns errors from FacilityRaw service', function(done) {

    error = 'boom';

    service(null, function(err) {
      chai.expect(err).to.equal('boom');
      done();
    });

  });

  it('builds empty hierarchy when no facilities', function(done) {

    facilities = [];

    service(null, function(err, actual, actualTotal) {
      chai.expect(err).to.equal(null);
      chai.expect(actual.length).to.equal(0);
      chai.expect(actualTotal).to.equal(0);
      done();
    });

  });

  it('builds hierarchy for facilities', function(done) {

    var a = { _id: 'a', parent: { _id: 'b' } };
    var b = { _id: 'b', parent: { _id: 'c' } };
    var c = { _id: 'c' };
    var d = { _id: 'd', parent: { _id: 'b' } };
    var e = { _id: 'e', parent: { _id: 'x' } }; // unknown parent is ignored
    var f = { _id: 'f' };

    facilities = [ { doc: a }, { doc: b }, { doc: c }, { doc: d }, { doc: e }, { doc: f } ];

    service(null, function(err, actual, actualTotal) {
      chai.expect(err).to.equal(null);
      chai.expect(actual).to.deep.equal([
        { doc: c, children: [
          { doc: b, children: [
            { doc: a },
            { doc: d }
          ] }
        ] },
        { doc: f }
      ]);
      chai.expect(actualTotal).to.equal(5);
      done();
    });

  });

});