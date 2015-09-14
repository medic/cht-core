describe('Form service', function() {

  'use strict';

  var service,
      $rootScope,
      Settings = sinon.stub(),
      Language = sinon.stub();

  beforeEach(function (){
    module('inboxApp');
    module(function ($provide) {
      $provide.value('Settings', Settings);
      $provide.value('Language', Language);
    });
    inject(function(_Form_, _$rootScope_) {
      $rootScope = _$rootScope_;
      service = _Form_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(Language, Settings);
  });

  it('returns zero when no forms', function(done) {
    Settings.callsArgWith(0, null, { forms: {} });
    Language.returns(KarmaUtils.mockPromise(null, 'en'));
    service(function(err, actual) {
      chai.expect(actual).to.deep.equal([]);
      done();
    });
    $rootScope.$digest(); // needed to resolve the promise
  });

  it('returns forms with old style labels', function(done) {
    Settings.callsArgWith(0, null, { forms: {
      A: { meta: { code: 'A', label: 'First'  } },
      B: { meta: { code: 'B', label: 'Second' } },
      C: { meta: { code: 'C', label: 'Third'  } },
      D: { meta: { code: 'D', label: 'Fourth' } }
    } });
    Language.returns(KarmaUtils.mockPromise(null, 'en'));
    service(function(err, actual) {
      chai.expect(actual).to.deep.equal([
        { code: 'A', name: 'First'  },
        { code: 'B', name: 'Second' },
        { code: 'C', name: 'Third'  },
        { code: 'D', name: 'Fourth' }
      ]);
      done();
    });
    $rootScope.$digest();
  });

  it('handles forms with no label', function(done) {
    Settings.callsArgWith(0, null, { forms: {
      A: { meta: { code: 'A' } },
      B: { meta: { code: 'B' } },
      C: { meta: { code: 'C', label: 'Third' } },
      D: { meta: { code: 'D' } }
    } });
    Language.returns(KarmaUtils.mockPromise(null, 'en'));
    service(function(err, actual) {
      chai.expect(actual).to.deep.equal([
        { code: 'A' },
        { code: 'B' },
        { name: 'Third', code: 'C' },
        { code: 'D' }
      ]);
      done();
    });
    $rootScope.$digest();
  });

  it('returns forms with translated label', function(done) {
    Settings.callsArgWith(0, null, { forms: {
      A: { meta: { code: 'A', label: { en: 'First',  sw: 'tsriF'  } } },
      B: { meta: { code: 'B', label: { en: 'Second', sw: 'dnoceS' } } },
      C: { meta: { code: 'C', label: { en: 'Third',  sw: 'drihT'  } } },
      D: { meta: { code: 'D', label: { en: 'Fourth', sw: 'htruoF' } } }
    } });
    Language.returns(KarmaUtils.mockPromise(null, 'sw'));
    service(function(err, actual) {
      chai.expect(actual).to.deep.equal([
        { code: 'A', name: 'tsriF'  },
        { code: 'B', name: 'dnoceS' },
        { code: 'C', name: 'drihT'  },
        { code: 'D', name: 'htruoF' }
      ]);
      done();
    });
    $rootScope.$digest();
  });

});