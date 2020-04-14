const sinon = require('sinon').sandbox.create();
const path = require('path');
require('chai').should();

const service = require('../../../src/services/settings');
const db = require('../../../src/db');
const environment = require('../../../src/environment');
const defaults = require('../../../../build/ddocs/medic/_attachments/default-docs/settings.doc.json');

let settings;
let replace;
let overwrite;

describe('settings service', () => {
  beforeEach(function() {
    settings = { a: 'a', permissions: { b: 'b'} };
    sinon.stub(db.medic, 'get').resolves({ settings });

    const resourceDirectory = path.resolve(__dirname, '../../../../build/ddocs/medic/_attachments');
    sinon.stub(environment, 'getExtractedResourcesPath').returns(resourceDirectory);
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('update', () => {
    it('does replace if replace is set and overwrite is not set', () => {
      const update = sinon.stub(db.medic, 'put').resolves();
      const newSettings = Object.assign({}, settings);
      delete newSettings['a'];
      replace = 1;

      return service
        .update(newSettings, replace, overwrite)
        .then(result => {
          update.callCount.should.equal(1);
          update.args[0][0].settings.should.deep.equal(settings);
          result.should.equal(true);
        });
    });

    it('does overwrite if replace is set and overwrite is set', () => {
      const update = sinon.stub(db.medic, 'put').resolves();
      const newSettings = Object.assign({}, settings);
      delete newSettings['a'];
      replace = 1;
      overwrite = 1;

      return service
        .update(newSettings, replace, overwrite)
        .then(result => {
          update.callCount.should.equal(1);
          update.args[0][0].settings.should.deep.equal(newSettings);
          result.should.equal(true);
        });
    });

    it('does not update if the settings doc has not been modified when replacing', () => {
      defaults.permissions = {};
      const update = sinon.stub(db.medic, 'put');
      replace = 1;

      return service
        .update(settings, replace)
        .then(result => {
          update.callCount.should.equal(0);
          result.should.equal(false);
        });
    });

    it('does not update if the settings doc has not been modified when extending', () => {
      defaults.permissions = {};
      const update = sinon.stub(db.medic, 'put');
      replace = 1;

      return service
        .update(settings)
        .then(result => {
          update.callCount.should.equal(0);
          result.should.equal(false);
        });
    });

    it('does update if the settings doc has been modified when replacing', () => {
      defaults.permissions = {};
      const update = sinon.stub(db.medic, 'put').resolves();
      const newSettings = Object.assign({}, settings);
      newSettings.a = 'b';
      replace = 1;

      return service
        .update(newSettings, replace)
        .then(result => {
          update.callCount.should.equal(1);
          update.args[0][0].settings.should.deep.equal(newSettings);
          result.should.equal(true);
        });
    });

    it('does update if the settings doc has been modified when extending', () => {
      defaults.permissions = {};
      const update = sinon.stub(db.medic, 'put').resolves();
      const newSettings = Object.assign({}, settings);
      newSettings.a = 'b';
      replace = 1;

      return service
        .update(newSettings, replace)
        .then(result => {
          update.callCount.should.equal(1);
          update.args[0][0].settings.should.deep.equal(newSettings);
          result.should.equal(true);
        });
    });

    it('does update if the default settings has an extra permission when replacing', () => {
      defaults.permissions = { c: 'd' };
      const update = sinon.stub(db.medic, 'put').resolves();
      replace = 1;

      return service
        .update(settings, replace)
        .then(result => {
          settings.permissions.c = 'd';

          update.callCount.should.equal(1);
          update.args[0][0].settings.should.deep.equal(settings);
          result.should.equal(true);
        });
    });

    it('does update if the default settings has an extra permission when extending', () => {
      defaults.permissions = { c: 'd' };
      const update = sinon.stub(db.medic, 'put').resolves();
      replace = 1;

      return service
        .update(settings, replace)
        .then(result => {
          settings.permissions.c = 'd';

          update.callCount.should.equal(1);
          update.args[0][0].settings.should.deep.equal(settings);
          result.should.equal(true);
        });
    });

    it('should throw db.put errors', () => {
      defaults.permissions = {};
      const update = sinon.stub(db.medic, 'put').rejects({ status: 409 });
      const newSettings = Object.assign({}, settings);
      newSettings.a = 'b';
      replace = 1;

      return service
        .update(newSettings, replace)
        .then(result => result.should.equal('Should have thrown'))
        .catch(err => {
          err.should.deep.equal({ status: 409 });
          update.callCount.should.equal(1);
          update.args[0][0].settings.should.deep.equal(newSettings);
        });
    });
  });
});
