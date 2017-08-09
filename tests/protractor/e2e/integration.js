const _ = require('underscore'),
      utils = require('../utils'),
      auth = require('../auth')();

describe('Integration', () => {

  'use strict';

  const message = {
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

  const logout = () => {
    return utils.request({
      method: 'DELETE',
      path: '/_session'
    });
  };

  const login = () => {
    return utils.request({
      method: 'POST',
      path: '/_session',
      body: JSON.stringify({
        name: auth.user,
        password: auth.pass
      })
    });
  };

  let savedUuid;
  beforeEach(done => {
    utils.saveDoc(message)
      .then(doc => {
        savedUuid = doc.id;
        logout()
          .then(() => {
            done();
          },
          err => {
            console.error('Error logging out', err);
            done();
          });
      }, err => {
        console.error('Error saving doc', err);
        done();
      });
  });

  afterEach(done => {
    login()
      .then(() => {
        utils.deleteDoc(savedUuid)
          .then(done, done);
      },
      err => {
        console.error('Error logging in', err);
        utils.deleteDoc(savedUuid)
          .then(done, done);
      });
  });

  it('can download messages using basic auth', () => {
    const flow = protractor.promise.controlFlow();
    flow.execute(() => {
      return utils.request({
        path: '/api/v1/messages',
        method: 'GET'
      });
    }).then(result => {
      const doc = _.findWhere(result, { _record_id: savedUuid });
      expect(doc._record_id).toEqual(savedUuid);
      expect(doc.message).toEqual('hello!');
    }, err => {
      console.error(err);
      expect(true).toEqual(false);
    });
  });
});

