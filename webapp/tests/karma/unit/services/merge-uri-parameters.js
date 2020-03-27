describe('MergeUriParameters service', function() {

  'use strict';

  let service;

  beforeEach(function() {
    module('inboxApp');
    inject(function(_MergeUriParameters_) {
      service = _MergeUriParameters_;
    });
  });

  it('adds params that do not exist', function() {
    const actual = service('/hello', { first: 'a', second: 'b' });
    chai.expect(actual).to.equal('/hello?first=a&second=b');
  });

  it('leaves irrelevant parameters that already exist', function() {
    const actual = service('/hello?something=true', { first: 'a', second: 'b' });
    chai.expect(actual).to.equal('/hello?first=a&second=b&something=true');
  });

  it('given parameters do not overwrite existing parameters', function() {
    const actual = service('/hello?something=true&first=c', { first: 'a', second: 'b' });
    chai.expect(actual).to.equal('/hello?first=c&second=b&something=true');
  });

});
