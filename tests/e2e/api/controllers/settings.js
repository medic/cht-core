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
            expect(response).toEqual({ success: true, updated: true });
          })
          .then(getDoc)
          .then(doc => {
            expect(doc.settings._test_sandbox).toEqual({ times: 'one', b: 'c' });
          })
          .then(() => {
            return update({ _test_sandbox: { times: 'two' } }, true);
          })
          .then(response => {
            expect(response).toEqual({ success: true, updated: true });
          })
          .then(getDoc)
          .then(doc => {
            expect(doc.settings._test_sandbox).toEqual({ times: 'two' });
          });
      });

      it('without replace', () => {
        return update({ _test_sandbox: { times: 'one', b: 'c' } }, false)
          .then(response => {
            expect(response).toEqual({ success: true, updated: true });
          })
          .then(getDoc)
          .then(doc => {
            expect(doc.settings._test_sandbox).toEqual({ times: 'one', b: 'c' });
          })
          .then(() => {
            return update({ _test_sandbox: { times: 'two' } }, false);
          })
          .then(response => {
            expect(response).toEqual({ success: true, updated: true });
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
          expect(response).toEqual({ success: true, updated: true });
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
            expect(response).toEqual({ success: true, updated: true });
          })
          .then(getDoc)
          .then(doc => {
            expect(doc.settings._test_sandbox).toEqual({ times: 'one', b: 'c' });
          })
          .then(() => {
            return update({ _test_sandbox: { times: 'two' } }, true);
          })
          .then(response => {
            expect(response).toEqual({ success: true, updated: true });
          })
          .then(getDoc)
          .then(doc => {
            expect(doc.settings._test_sandbox).toEqual({ times: 'two' });
          });
      });

      it('without replace', () => {
        return update({ _test_sandbox: { times: 'one', b: 'c' } }, false)
          .then(response => {
            expect(response).toEqual({ success: true, updated: true });
          })
          .then(getDoc)
          .then(doc => {
            expect(doc.settings._test_sandbox).toEqual({ times: 'one', b: 'c' });
          })
          .then(() => {
            return update({ _test_sandbox: { times: 'two' } }, false);
          })
          .then(response => {
            expect(response).toEqual({ success: true, updated: true });
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
          expect(response).toEqual({ success: true, updated: true });
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

  });

});
