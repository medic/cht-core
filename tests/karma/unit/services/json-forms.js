describe('JsonForms service', function() {

  'use strict';

  var service,
      Settings = sinon.stub();

  beforeEach(function() {
    module('inboxApp');
    module(function($provide) {
      $provide.value('Settings', Settings);
    });
    inject(function(_JsonForms_) {
      service = _JsonForms_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(Settings);
  });

  it('returns zero when no forms', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { forms: {} }));
    service()
      .then(function(actual) {
        chai.expect(actual).to.deep.equal([]);
        done();
      })
      .catch(done);
  });

  it('returns forms with old style labels', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { forms: {
      A: { meta: { code: 'A', label: 'First',  icon: 'a' } },
      B: { meta: { code: 'B', label: 'Second', icon: 'b' } },
      C: { meta: { code: 'C', label: 'Third',  icon: 'c' } },
      D: { meta: { code: 'D', label: 'Fourth', icon: 'd' } }
    } }));
    service()
      .then(function(actual) {
        chai.expect(actual).to.deep.equal([
          { code: 'A', name: 'First',  icon: 'a' },
          { code: 'B', name: 'Second', icon: 'b' },
          { code: 'C', name: 'Third',  icon: 'c' },
          { code: 'D', name: 'Fourth', icon: 'd' }
        ]);
        done();
      })
      .catch(done);
  });

  it('handles forms with no label', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { forms: {
      A: { meta: { code: 'A' } },
      B: { meta: { code: 'B', icon: 'b' } },
      C: { meta: { code: 'C', label: 'Third' } },
      D: { meta: { code: 'D' } }
    } }));
    service()
      .then(function(actual) {
        chai.expect(actual).to.deep.equal([
          { code: 'A', name: undefined, icon: undefined },
          { code: 'B', name: undefined, icon: 'b' },
          { code: 'C', name: 'Third',   icon: undefined },
          { code: 'D', name: undefined, icon: undefined }
        ]);
        done();
      })
      .catch(done);
  });

});
