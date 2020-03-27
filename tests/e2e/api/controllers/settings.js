const path = require('path');
const constants = require('../../../constants');
const utils = require('../../../utils');

const getDoc = () => {
  return utils.getDoc('settings');
};

describe('Settings API', () => {
  afterAll(done => utils.revertSettings().then(done));

  describe('old api', () => {

    const update = (updates, replace=false) => {
      let uri = path.join('/', constants.DB_NAME, '_design',
        constants.MAIN_DDOC_NAME, '_rewrite/update_settings', constants.MAIN_DDOC_NAME);
      if (replace) {
        uri += '?replace=1';
      }
      return utils.request({
        path: uri,
        method: 'PUT',
        body: updates,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    describe('update', () => {

      it('with replace', () => {
        return update({ _test_sandbox: { times: 'one', b: 'c' } }, true)
          .then(response => {
            expect(response).toEqual({ success: true });
          })
          .then(getDoc)
          .then(doc => {
            expect(doc.settings._test_sandbox).toEqual({ times: 'one', b: 'c' });
          })
          .then(() => {
            return update({ _test_sandbox: { times: 'two' } }, true);
          })
          .then(response => {
            expect(response).toEqual({ success: true });
          })
          .then(getDoc)
          .then(doc => {
            expect(doc.settings._test_sandbox).toEqual({ times: 'two' });
          });
      });

      it('without replace', () => {
        return update({ _test_sandbox: { times: 'one', b: 'c' } }, false)
          .then(response => {
            expect(response).toEqual({ success: true });
          })
          .then(getDoc)
          .then(doc => {
            expect(doc.settings._test_sandbox).toEqual({ times: 'one', b: 'c' });
          })
          .then(() => {
            return update({ _test_sandbox: { times: 'two' } }, false);
          })
          .then(response => {
            expect(response).toEqual({ success: true });
          })
          .then(getDoc)
          .then(doc => {
            expect(doc.settings._test_sandbox).toEqual({ times: 'two', b: 'c' });
          });
      });

    });

    it('get', () => {
      return update({ _test_sandbox: { times: 'three', b: 'c' } }, true)
        .then(response => {
          expect(response).toEqual({ success: true });
        })
        .then(() => {
          return utils.request({
            path: path.join('/', constants.DB_NAME, '_design', constants.MAIN_DDOC_NAME,
              '_rewrite/app_settings', constants.MAIN_DDOC_NAME),
            method: 'GET'
          });
        })
        .then(response => {
          expect(response.settings._test_sandbox).toEqual({ times: 'three', b: 'c' });
        });
    });

  });

  describe('new api', () => {

    const update = (updates, replace=false) => {
      const uri = '/api/v1/settings' + (replace ? '?replace=1' : '');
      return utils.request({
        path: uri,
        method: 'PUT',
        body: updates,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    describe('update', () => {

      it('with replace', () => {
        return update({ _test_sandbox: { times: 'one', b: 'c' } }, true)
          .then(response => {
            expect(response).toEqual({ success: true });
          })
          .then(getDoc)
          .then(doc => {
            expect(doc.settings._test_sandbox).toEqual({ times: 'one', b: 'c' });
          })
          .then(() => {
            return update({ _test_sandbox: { times: 'two' } }, true);
          })
          .then(response => {
            expect(response).toEqual({ success: true });
          })
          .then(getDoc)
          .then(doc => {
            expect(doc.settings._test_sandbox).toEqual({ times: 'two' });
          });
      });

      it('without replace', () => {
        return update({ _test_sandbox: { times: 'one', b: 'c' } }, false)
          .then(response => {
            expect(response).toEqual({ success: true });
          })
          .then(getDoc)
          .then(doc => {
            expect(doc.settings._test_sandbox).toEqual({ times: 'one', b: 'c' });
          })
          .then(() => {
            return update({ _test_sandbox: { times: 'two' } }, false);
          })
          .then(response => {
            expect(response).toEqual({ success: true });
          })
          .then(getDoc)
          .then(doc => {
            expect(doc.settings._test_sandbox).toEqual({ times: 'two', b: 'c' });
          });
      });

    });

    it('get', () => {
      return update({ _test_sandbox: { times: 'three', b: 'c' } }, true)
        .then(response => {
          expect(response).toEqual({ success: true });
        })
        .then(() => {
          return utils.request({
            path: '/api/v1/settings',
            method: 'GET'
          });
        })
        .then(response => {
          expect(response._test_sandbox).toEqual({ times: 'three', b: 'c' });
        });
    });


    it('should reject invalid settings updates', () => {
      return getDoc()
        .then(settings => {
          settings.gateway_number = '+1234567890';
          settings.permissions = [];
          return update(settings);
        })
        .catch(e => {
          e = e.error;
          expect(e.code).toEqual(400);
          expect(JSON.parse(e.error)[0].message).toEqual('should be object');
        })
        .then(() => {
          return utils.request({
            path: '/api/v1/settings',
            method: 'GET'
          });
        })
        .then(response => {
          expect(response.permissions).not.toEqual([]);
          expect(response.gateway_number).not.toEqual('+1234567890');
        });
    });

    it('should validate custom roles', () => {
      const settings = {
        roles: {
          e2e_test: {
            name: 'usertype.e2e_test'
          }
        },
        permissions: {
          can_export_messages: [
            'national_admin',
            'e2e_test',
            'non_existent_role'
          ]
        }
      };
      return update(settings)
        .catch(e => {
          e = e.error;
          expect(e.code).toEqual(400);
          expect(JSON.parse(e.error)[0].message).toEqual('should be equal to one of the allowed values');
        })
        .then(() => {
          settings.roles.non_existent_role = {
            name: 'usertype.non_existent_role'
          };
          return update(settings);
        })
        .then(response => {
          expect(response).toEqual({ success: true });
        });
    });

  });

});
