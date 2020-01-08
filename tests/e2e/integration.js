const utils = require('../utils');
const auth = require('../auth')();

/* eslint-disable no-console */
describe('Integration', () => {
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
      body: {
        name: auth.username,
        password: auth.password
      }
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
});
