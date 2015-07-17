describe('ReadMessages service', function() {

  'use strict';

  var service,
      successCb,
      failCb;

  beforeEach(function (){
    module('inboxApp');
    module(function ($provide) {
      $provide.value('DB', {
        get: function() {
          return {
            query: function() {
              return {
                then: function(cb) {
                  successCb = cb;
                  return {
                    catch: function(cb) {
                      failCb = cb;
                    }
                  };
                }
              };
            }
          };
        }
      });
    });
    inject(function($injector) {
      service = $injector.get('ReadMessages');
    });
  });

  it('returns zero when no messages', function(done) {
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
    successCb({ rows: [] });
  });

  it('returns total when no district', function(done) {
    service({
      user: 'gareth'
    }, function(err, res) {
      chai.expect(res).to.deep.equal({
        forms: 10,
        messages: 5
      });
      done();
    });
    successCb({ rows: [
      {'key': ['_total', 'forms',    'christchurch'], 'value': 5 },
      {'key': ['_total', 'forms',    'dunedin'],      'value': 31},
      {'key': ['_total', 'messages', 'dunedin'],      'value': 10},
      {'key': ['gareth', 'forms',    'christchurch'], 'value': 3 },
      {'key': ['gareth', 'forms',    'dunedin'],      'value': 23},
      {'key': ['gareth', 'messages', 'dunedin'],      'value': 5 },
      {'key': ['test3',  'messages', 'dunedin'],      'value': 2 }
    ] });
  });

  it('returns total when district', function(done) {
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
    successCb({ rows: [
      {'key': ['_total', 'forms',    'christchurch'], 'value': 5 },
      {'key': ['_total', 'forms',    'dunedin'],      'value': 31},
      {'key': ['_total', 'messages', 'dunedin'],      'value': 10},
      {'key': ['gareth', 'forms',    'christchurch'], 'value': 3 },
      {'key': ['gareth', 'forms',    'dunedin'],      'value': 23},
      {'key': ['gareth', 'messages', 'dunedin'],      'value': 5 },
      {'key': ['test3',  'messages', 'dunedin'],      'value': 2 }
    ] });
  });

});