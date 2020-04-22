describe('JsonForms service', function() {

  'use strict';

  let service;
  const Settings = sinon.stub();

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
    Settings.returns(Promise.resolve({ forms: {} }));
    service()
      .then(function(actual) {
        chai.expect(actual).to.deep.equal([]);
        done();
      })
      .catch(done);
  });

  it('returns forms with names and translation keys', function(done) {
    Settings.returns(Promise.resolve({ forms: {
      A: { meta: { code: 'A', label: 'First',  icon: 'a' } },
      B: { meta: { code: 'B', label: 'Second', icon: 'b' } },
      C: { meta: { code: 'C', label: 'Third',  icon: 'c' } },
      D: { meta: { code: 'D', translation_key: 'Fourth', icon: 'd' } },
      E: { meta: { code: 'E', subject_key: 'Fifth', icon: 'd' } }
    } }));
    service()
      .then(function(actual) {
        chai.expect(actual).to.deep.equal([
          { code: 'A', name: 'First',   translation_key: undefined, icon: 'a', subject_key: undefined },
          { code: 'B', name: 'Second',  translation_key: undefined, icon: 'b', subject_key: undefined },
          { code: 'C', name: 'Third',   translation_key: undefined, icon: 'c', subject_key: undefined },
          { code: 'D', name: undefined, translation_key: 'Fourth' , icon: 'd', subject_key: undefined },
          { code: 'E', name: undefined, translation_key: undefined, icon: 'd', subject_key: 'Fifth'   },
        ]);
        done();
      })
      .catch(done);
  });

  it('handles forms with no label', function(done) {
    Settings.returns(Promise.resolve({ forms: {
      A: { meta: { code: 'A' } },
      B: { meta: { code: 'B', icon: 'b' } },
      C: { meta: { code: 'C', label: 'Third' } },
      D: { meta: { code: 'D' } }
    } }));
    service()
      .then(function(actual) {
        chai.expect(actual).to.deep.equal([
          { code: 'A', name: undefined, translation_key: undefined, icon: undefined, subject_key: undefined },
          { code: 'B', name: undefined, translation_key: undefined, icon: 'b'      , subject_key: undefined },
          { code: 'C', name: 'Third',   translation_key: undefined, icon: undefined, subject_key: undefined },
          { code: 'D', name: undefined, translation_key: undefined, icon: undefined, subject_key: undefined }
        ]);
        done();
      })
      .catch(done);
  });

});
