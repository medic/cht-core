const chai = require('chai');
const path = require('path');
const constants = require('../../../constants');
const utils = require('../../../utils');

const getDoc = () => {
  return utils.getDoc('settings');
};

describe('Settings API', () => {
  before(() => utils.updateSettings({}, true));
  after(() => utils.revertSettings(true));

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
            chai.expect(response).to.deep.equal({ success: true, updated: true });
          })
          .then(getDoc)
          .then(doc => {
            chai.expect(doc.settings._test_sandbox).to.deep.equal({ times: 'one', b: 'c' });
          })
          .then(() => {
            return update({ _test_sandbox: { times: 'two' } }, true);
          })
          .then(response => {
            chai.expect(response).to.deep.equal({ success: true, updated: true });
          })
          .then(getDoc)
          .then(doc => {
            chai.expect(doc.settings._test_sandbox).to.deep.equal({ times: 'two' });
          });
      });

      it('without replace', () => {
        return update({ _test_sandbox: { times: 'one', b: 'c' } }, false)
          .then(response => {
            chai.expect(response).to.deep.equal({ success: true, updated: true });
          })
          .then(getDoc)
          .then(doc => {
            chai.expect(doc.settings._test_sandbox).to.deep.equal({ times: 'one', b: 'c' });
          })
          .then(() => {
            return update({ _test_sandbox: { times: 'two' } }, false);
          })
          .then(response => {
            chai.expect(response).to.deep.equal({ success: true, updated: true });
          })
          .then(getDoc)
          .then(doc => {
            chai.expect(doc.settings._test_sandbox).to.deep.equal({ times: 'two', b: 'c' });
          });
      });

      it('without changes', () => {
        return update({}, false)
          .then(response => {
            chai.expect(response).to.deep.equal({ success: true, updated: false });
          });
      });

    });

    it('get', () => {
      return update({ _test_sandbox: { times: 'three', b: 'c' } }, true)
        .then(response => {
          chai.expect(response).to.deep.equal({ success: true, updated: true });
        })
        .then(() => {
          return utils.request({
            path: path.join('/', constants.DB_NAME, '_design', constants.MAIN_DDOC_NAME,
              '_rewrite/app_settings', constants.MAIN_DDOC_NAME),
            method: 'GET'
          });
        })
        .then(response => {
          chai.expect(response.settings._test_sandbox).to.deep.equal({ times: 'three', b: 'c' });
        });
    });

  });

  describe('new api', () => {

    const update = (updates, replace= false, overwrite = false) => {
      const qs = {};
      if (replace) {
        qs.replace = 1;
      }
      if (overwrite) {
        qs.overwrite = 1;
      }

      return utils.request({
        path: '/api/v1/settings',
        method: 'PUT',
        body: updates,
        headers: { 'Content-Type': 'application/json' },
        qs,
      });
    };

    describe('update', () => {

      it('with replace', () => {
        return update({ _test_sandbox: { times: 'one', b: 'c' } }, true)
          .then(response => {
            chai.expect(response).to.deep.equal({ success: true, updated: true });
          })
          .then(getDoc)
          .then(doc => {
            chai.expect(doc.settings._test_sandbox).to.deep.equal({ times: 'one', b: 'c' });
          })
          .then(() => {
            return update({ _test_sandbox: { times: 'two' } }, true);
          })
          .then(response => {
            chai.expect(response).to.deep.equal({ success: true, updated: true });
          })
          .then(getDoc)
          .then(doc => {
            chai.expect(doc.settings._test_sandbox).to.deep.equal({ times: 'two' });
          });
      });

      it('without replace', () => {
        return update({ _test_sandbox: { times: 'one', b: 'c' } }, false)
          .then(response => {
            chai.expect(response).to.deep.equal({ success: true, updated: true });
          })
          .then(getDoc)
          .then(doc => {
            chai.expect(doc.settings._test_sandbox).to.deep.equal({ times: 'one', b: 'c' });
          })
          .then(() => {
            return update({ _test_sandbox: { times: 'two' } }, false);
          })
          .then(response => {
            chai.expect(response).to.deep.equal({ success: true, updated: true });
          })
          .then(getDoc)
          .then(doc => {
            chai.expect(doc.settings._test_sandbox).to.deep.equal({ times: 'two', b: 'c' });
          });
      });

      it('with overwrite', () => {
        return update({ no_other_fields: true }, false, true)
          .then(response => chai.expect(response).to.deep.equal({ success: true, updated: true }))
          .then(getDoc)
          .then(doc => {
            // permissions are copied from the default config!
            chai.expect(doc.settings).have.all.keys('no_other_fields', 'permissions');
            chai.expect(doc.settings.no_other_fields).to.deep.equal(true);
          })
          .then(() => update({ some_other_fields: false }, true, true))
          .then(response => chai.expect(response).to.deep.equal({ success: true, updated: true }))
          .then(getDoc)
          .then(doc => {
            chai.expect(doc.settings).have.all.keys('some_other_fields', 'permissions');
            chai.expect(doc.settings.some_other_fields).to.deep.equal(false);
          });
      });

      it('with no changes', () => {
        return update({ new_field: { yes: true } })
          .then(response => chai.expect(response).to.deep.equal({ success: true, updated: true }))
          .then(getDoc)
          .then(doc => chai.expect(doc.settings.new_field).to.deep.equal({ yes: true }))
          .then(() => update({ new_field: { yes: true } })) // no replace, but same value
          .then(response => chai.expect(response).to.deep.equal({ success: true, updated: false }))
          .then(() => update({ new_field: { yes: true } }, true)) // with replace, but same value
          .then(response => chai.expect(response).to.deep.equal({ success: true, updated: false }))
          .then(() => update({ new_field: { yes: false } })) // no replace, but different value
          .then(response => chai.expect(response).to.deep.equal({ success: true, updated: true }));
      });

    });

    it('get', () => {
      return update({ _test_sandbox: { times: 'three', b: 'c' } }, true)
        .then(response => {
          chai.expect(response).to.deep.equal({ success: true, updated: true });
        })
        .then(() => {
          return utils.request({
            path: '/api/v1/settings',
            method: 'GET'
          });
        })
        .then(response => {
          chai.expect(response._test_sandbox).to.deep.equal({ times: 'three', b: 'c' });
        });
    });

  });

});
