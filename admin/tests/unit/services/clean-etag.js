describe('CleanETag service', function() {
  'use strict';

  let service;

  beforeEach(function() {
    module('adminApp');
    inject(function(_CleanETag_) {
      service = _CleanETag_;
    });
  });

  it('handles undefined', function(done) {
    chai.expect(service()).to.equal(undefined);
    done();
  });

  it('handles empty string', function(done) {
    chai.expect(service('')).to.equal('');
    done();
  });

  it('strips quotes off regular etag', function(done) {
    const actual = service('"5-d7610cd8aa072a9a0d166f95232bcbfa"');
    chai.expect(actual).to.equal('5-d7610cd8aa072a9a0d166f95232bcbfa');
    done();
  });

  it('strips prefix off gzipped etag', function(done) {
    const actual = service('W/"3-18969d4f566e8c9dbea5c3289674edb0"');
    chai.expect(actual).to.equal('3-18969d4f566e8c9dbea5c3289674edb0');
    done();
  });

});
