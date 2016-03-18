describe('Form service', function() {

  'use strict';

  var service,
      Settings = sinon.stub();

  beforeEach(function() {
    module('inboxApp');
    module(function($provide) {
      $provide.value('Settings', Settings);
    });
    inject(function(_Form_) {
      service = _Form_;
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
      A: { meta: { code: 'A', label: 'First'  } },
      B: { meta: { code: 'B', label: 'Second' } },
      C: { meta: { code: 'C', label: 'Third'  } },
      D: { meta: { code: 'D', label: 'Fourth' } }
    } }));
    service()
      .then(function(actual) {
        chai.expect(actual).to.deep.equal([
          { code: 'A', name: 'First'  },
          { code: 'B', name: 'Second' },
          { code: 'C', name: 'Third'  },
          { code: 'D', name: 'Fourth' }
        ]);
        done();
      })
      .catch(done);
  });

  it('handles forms with no label', function(done) {
    Settings.returns(KarmaUtils.mockPromise(null, { forms: {
      A: { meta: { code: 'A' } },
      B: { meta: { code: 'B' } },
      C: { meta: { code: 'C', label: 'Third' } },
      D: { meta: { code: 'D' } }
    } }));
    service()
      .then(function(actual) {
        chai.expect(actual).to.deep.equal([
          { code: 'A', name: undefined },
          { code: 'B', name: undefined },
          { code: 'C', name: 'Third' },
          { code: 'D', name: undefined }
        ]);
        done();
      })
      .catch(done);
  });

});