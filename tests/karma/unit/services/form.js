describe('Form service', function() {

  'use strict';

  var service,
      results,
      language = 'en',
      $translateProvider,
      $rootScope;

  beforeEach(function (){
    module('inboxApp');
    module(function ($provide) {
      $provide.value('Settings', function(callback) {
        callback(null, { forms: results });
      });
      $provide.value('Language', function(callback) {
        callback(null, language);
      });
    });
    inject(function(_Form_, _$rootScope_, _$translate_) {
      $rootScope = _$rootScope_;
      $translateProvider = _$translate_;
      service = _Form_;
    });
  });

  it('returns zero when no forms', function(done) {

    results = {};
    var expected = [];

    service().then(
      function(actual) {
        chai.expect(actual).to.deep.equal(expected);
        done();
      }
    );

    // needed to resolve the promise
    $rootScope.$digest();
  });

  it('returns forms with old style labels', function(done) {

    results = {
      A: { meta: { code: 'A', label: 'First'  } },
      B: { meta: { code: 'B', label: 'Second' } },
      C: { meta: { code: 'C', label: 'Third'  } },
      D: { meta: { code: 'D', label: 'Fourth' } }
    };
    var expected = [
      { code: 'A', name: 'First'  },
      { code: 'B', name: 'Second' },
      { code: 'C', name: 'Third'  },
      { code: 'D', name: 'Fourth' }
    ];

    service().then(
      function(actual) {
        chai.expect(actual).to.deep.equal(expected);
        done();
      }
    );

    $rootScope.$digest();
  });

  it('handles forms with no label', function(done) {

    results = {
      A: { meta: { code: 'A' } },
      B: { meta: { code: 'B' } },
      C: { meta: { code: 'C', label: 'Third' } },
      D: { meta: { code: 'D' } }
    };
    var expected = [
      { code: 'A' },
      { code: 'B' },
      { name: 'Third', code: 'C' },
      { code: 'D' }
    ];


    service().then(
      function(actual) {
        chai.expect(actual).to.deep.equal(expected);
        done();
      }
    );

    $rootScope.$digest();
  });

  it('returns forms with translated label', function(done) {

    results = {
      A: { meta: { code: 'A', label: { en: 'First',  sw: 'tsriF'  } } },
      B: { meta: { code: 'B', label: { en: 'Second', sw: 'dnoceS' } } },
      C: { meta: { code: 'C', label: { en: 'Third',  sw: 'drihT'  } } },
      D: { meta: { code: 'D', label: { en: 'Fourth', sw: 'htruoF' } } }
    };
    var expected = [
      { code: 'A', name: 'tsriF'  },
      { code: 'B', name: 'dnoceS' },
      { code: 'C', name: 'drihT'  },
      { code: 'D', name: 'htruoF' }
    ];

    language = 'sw';

    service().then(
      function(actual) {
        chai.expect(actual).to.deep.equal(expected);
        done();
      }
    );

    $rootScope.$digest();
  });

});