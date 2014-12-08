describe('ReadMessages service', function() {

  'use strict';

  var service,
      results,
      $rootScope;

  beforeEach(function (){
    module('inboxApp');
    module(function ($provide) {
      $provide.value('ReadMessagesRaw', {
        query: function(callback) {
          callback({'rows': results});
        }
      });
    });
    inject(function(_ReadMessages_, _$rootScope_) {
      $rootScope = _$rootScope_;
      service = _ReadMessages_;
    });
  });

  it('returns zero when no messages', function(done) {

    results = [];

    service({
      user: 'gareth',
      district: 'dunedin'
    }).then(
      function(res) {
        chai.expect(res).to.deep.equal({
          forms: 0,
          messages: 0
        });
        done();
      }
    );

    // needed to resolve the promise
    $rootScope.$digest();
  });

  it('returns total when no district', function(done) {

    results = [
      {'key': ['_total', 'forms',    'christchurch'], 'value': 5 },
      {'key': ['_total', 'forms',    'dunedin'],      'value': 31},
      {'key': ['_total', 'messages', 'dunedin'],      'value': 10},
      {'key': ['gareth', 'forms',    'christchurch'], 'value': 3 },
      {'key': ['gareth', 'forms',    'dunedin'],      'value': 23},
      {'key': ['gareth', 'messages', 'dunedin'],      'value': 5 },
      {'key': ['test3',  'messages', 'dunedin'],      'value': 2 }
    ];

    service({
      user: 'gareth'
    }).then(
      function(res) {
        chai.expect(res).to.deep.equal({
          forms: 10,
          messages: 5
        });
        done();
      }
    );

    // needed to resolve the promise
    $rootScope.$digest();
  });

  it('returns total when district', function(done) {

    results = [
      {'key': ['_total', 'forms',    'christchurch'], 'value': 5 },
      {'key': ['_total', 'forms',    'dunedin'],      'value': 31},
      {'key': ['_total', 'messages', 'dunedin'],      'value': 10},
      {'key': ['gareth', 'forms',    'christchurch'], 'value': 3 },
      {'key': ['gareth', 'forms',    'dunedin'],      'value': 23},
      {'key': ['gareth', 'messages', 'dunedin'],      'value': 5 },
      {'key': ['test3',  'messages', 'dunedin'],      'value': 2 }
    ];

    service({
      user: 'gareth',
      district: 'dunedin'
    }).then(
      function(res) {
        chai.expect(res).to.deep.equal({
          forms: 8,
          messages: 5
        });
        done();
      }
    );

    // needed to resolve the promise
    $rootScope.$digest();
  });

});