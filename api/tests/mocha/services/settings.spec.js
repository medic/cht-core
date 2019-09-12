const sinon = require('sinon').sandbox.create();
require('chai').should();

const service = require('../../../src/services/settings'),
      db = require('../../../src/db'),
      defaults = require('../../../src/config.default.json');

let settings,
    replace;

describe('settings service', () => {
  beforeEach(function() {
    settings = { a: 'a', permissions: { b: 'b'} };
    replace = 1;
    sinon.stub(db.medic, 'get').resolves({ settings });
  });

  afterEach(function() {
    sinon.restore();
  });

  describe('update', () => {
    it('does not update if the settings doc has not been modified when replacing', () => {
      defaults.permissions = {};
      const update = sinon.stub(db.medic, 'put');
      
      return service
        .update(settings, replace)
        .then(() => {
          update.callCount.should.equal(0);
        });
    });

    it('does not update if the settings doc has not been modified when extending', () => {
      defaults.permissions = {};
      const update = sinon.stub(db.medic, 'put');
      
      return service
        .update(settings)
        .then(() => {
          update.callCount.should.equal(0);
        });
    });

    it('does update if the settings doc has been modified when replacing', () => {
      defaults.permissions = {};
      const update = sinon.stub(db.medic, 'put');
      let newSettings = Object.assign({}, settings);
      newSettings.a = 'b';
      
      return service
        .update(newSettings, replace)
        .then(() => {
          update.callCount.should.equal(1);
        });
    });

    it('does update if the settings doc has been modified when extending', () => {
      defaults.permissions = {};
      const update = sinon.stub(db.medic, 'put');
      let newSettings = Object.assign({}, settings);
      newSettings.a = 'b';
      
      return service
        .update(newSettings, replace)
        .then(() => {
          update.callCount.should.equal(1);
        });
    });

    it('does update if the default settings has an extra permission when replacing', () => {
      defaults.permissions = { c: 'd' };
      const update = sinon.stub(db.medic, 'put');
      
      return service
        .update(settings, replace)
        .then(() => {
          update.callCount.should.equal(1);
        });
    });

    it('does update if the default settings has an extra permission when extending', () => {
      defaults.permissions = { c: 'd' };
      const update = sinon.stub(db.medic, 'put');
      
      return service
        .update(settings, replace)
        .then(() => {
          update.callCount.should.equal(1);
        });
    });
  });
});