var _ = require('underscore'),
    utils = require('../utils'),
    auth = require('../auth');

describe('Integration', function() {

  'use strict';

  var message = {
    errors: [],
    form: null,
    from: '0211111111',
    reported_date: 1432801258088,
    tasks: [
      {
        messages: [
          {
            from: '0211111111',
            sent_by: 'gareth',
            to: '+64555555555',
            message: 'hello!',
            uuid: '0a2bda49-7b12-67ce-c9140a6e14007c7a'
          }
        ],
        state: 'pending',
        state_history: [
          {
            state: 'pending',
            timestamp: (new Date()).toISOString()
          }
        ]
      }
    ],
    read: ['gareth'],
    kujua_message: true,
    type: 'data_record',
    sent_by: 'gareth'
  };

  var logout = function() {
    return utils.request({
      method: 'DELETE',
      path: '/_session'
    });
  };

  var login = function() {
    var environment = auth();
    return utils.request({
      method: 'POST',
      path: '/_session',
      body: JSON.stringify({
        name: environment.user,
        password: environment.pass
      })
    });
  };

  var savedUuid;
  beforeEach(function(done) {
    utils.saveDoc(message)
      .then(function(doc) {
        savedUuid = doc.id;
        logout()
          .then(function() {
            done();
          },
          function(err) {
            console.error('Error logging out', err);
            done();
          });
      }, function(err) {
        console.error('Error saving doc', err);
        done();
      });
  });

  afterEach(function(done) {
    login()
      .then(function() {
        utils.deleteDoc(savedUuid)
          .then(done, done);
      },
      function(err) {
        console.error('Error logging in', err);
        utils.deleteDoc(savedUuid)
          .then(done, done);
      });
  });

  it('can download messages using basic auth', function() {
    var flow = protractor.promise.controlFlow();
    flow.execute(function() {
      return utils.request({
        path: '/api/v1/messages',
        method: 'GET'
      });
    }).then(function(result) {
      var doc = _.findWhere(result, { _record_id: savedUuid });
      expect(doc._record_id).toEqual(savedUuid);
      expect(doc.message).toEqual('hello!');
    }, function(err) {
        console.error(err);
        expect(true).toEqual(false);
    });
  });
});

