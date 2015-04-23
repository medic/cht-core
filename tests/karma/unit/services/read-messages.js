describe('ReadMessages service', function() {

  'use strict';

  var service,
      $httpBackend;

  beforeEach(function (){
    module('inboxApp');
    module(function ($provide) {
      $provide.value('BaseUrlService', function() {
        return 'BASE';
      });
    });
    inject(function($injector) {
      $httpBackend = $injector.get('$httpBackend');
      service = $injector.get('ReadMessages');
    });
  });

  afterEach(function() {
    $httpBackend.verifyNoOutstandingExpectation();
    $httpBackend.verifyNoOutstandingRequest();
  });

  it('returns zero when no messages', function(done) {

    $httpBackend
      .expect('GET', 'BASE/read_records?group=true')
      .respond({ rows: [] });

    service({
      user: 'gareth',
      district: 'dunedin'
    }, function(err, res) {
      chai.expect(res).to.deep.equal({
        forms: 0,
        messages: 0
      });
      done();
    });

    $httpBackend.flush();
  });

  it('returns total when no district', function(done) {

    $httpBackend
      .expect('GET', 'BASE/read_records?group=true')
      .respond({ rows: [
        {'key': ['_total', 'forms',    'christchurch'], 'value': 5 },
        {'key': ['_total', 'forms',    'dunedin'],      'value': 31},
        {'key': ['_total', 'messages', 'dunedin'],      'value': 10},
        {'key': ['gareth', 'forms',    'christchurch'], 'value': 3 },
        {'key': ['gareth', 'forms',    'dunedin'],      'value': 23},
        {'key': ['gareth', 'messages', 'dunedin'],      'value': 5 },
        {'key': ['test3',  'messages', 'dunedin'],      'value': 2 }
      ] });

    service({
      user: 'gareth'
    }, function(err, res) {
      chai.expect(res).to.deep.equal({
        forms: 10,
        messages: 5
      });
      done();
    });

    $httpBackend.flush();
  });

  it('returns total when district', function(done) {

    $httpBackend
      .expect('GET', 'BASE/read_records?group=true')
      .respond({ rows: [
        {'key': ['_total', 'forms',    'christchurch'], 'value': 5 },
        {'key': ['_total', 'forms',    'dunedin'],      'value': 31},
        {'key': ['_total', 'messages', 'dunedin'],      'value': 10},
        {'key': ['gareth', 'forms',    'christchurch'], 'value': 3 },
        {'key': ['gareth', 'forms',    'dunedin'],      'value': 23},
        {'key': ['gareth', 'messages', 'dunedin'],      'value': 5 },
        {'key': ['test3',  'messages', 'dunedin'],      'value': 2 }
      ] });

    service({
      user: 'gareth',
      district: 'dunedin'
    }, function(err, res) {
      chai.expect(res).to.deep.equal({
        forms: 8,
        messages: 5
      });
      done();
    });

    $httpBackend.flush();
  });

});