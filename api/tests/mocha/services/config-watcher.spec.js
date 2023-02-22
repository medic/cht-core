const chai = require('chai');
const sinon = require('sinon');
const fs = require('fs');

const viewMapUtils = require('@medic/view-map-utils');
const db = require('../../../src/db');
const settingsService = require('../../../src/services/settings');
const translations = require('../../../src/translations');
const generateServiceWorker = require('../../../src/generate-service-worker');
const generateXform = require('../../../src/services/generate-xform');
const config = require('../../../src/config');
const bootstrap = require('../../../src/services/config-watcher');
const manifest = require('../../../src/services/manifest');
const environment = require('../../../src/environment');

let on;
const emitChange = (change) => {
  const changeCallback = on.args[0][1];
  return changeCallback(change);
};

describe('Configuration', () => {
  beforeEach(() => {
    on = sinon.stub();
    on.returns({ on });

    sinon.stub(db, 'createVault');
    sinon.stub(db.medic, 'get');
    sinon.stub(db.medic, 'query');
    sinon.stub(db.medic, 'changes').returns({ on });
    sinon.stub(viewMapUtils, 'loadViewMaps');
    sinon.stub(translations, 'run');
    sinon.stub(settingsService, 'get');
    sinon.stub(settingsService, 'update');
    sinon.stub(generateServiceWorker, 'run');
    sinon.stub(manifest, 'generate');
    sinon.spy(config, 'set');
    sinon.spy(config, 'setTranslationCache');
    sinon.spy(config, 'setTransitionsLib');
    sinon.stub(fs, 'watch');
    sinon.stub(translations, 'getTranslationDocs');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('load', () => {
    it('loads app settings combining with default config, loads views into ViewMaps, loads translations', () => {
      settingsService.update.resolves();
      settingsService.get.resolves({ foo: 'bar' });
      db.medic.get.withArgs('_design/medic').resolves({ _id: '_design/medic' });
      translations.getTranslationDocs.resolves([]);

      return bootstrap.load().then(() => {
        chai.expect(db.medic.get.callCount).to.equal(1);
        chai.expect(db.medic.get.args[0][0]).to.equal('_design/medic');
        chai.expect(viewMapUtils.loadViewMaps.callCount).to.equal(1);
        chai
          .expect(viewMapUtils.loadViewMaps.args[0])
          .to.deep.equal([
            { _id: '_design/medic' },
            'docs_by_replication_key',
            'contacts_by_depth',
          ]);
        chai.expect(translations.getTranslationDocs.callCount).to.equal(1);

        chai.expect(settingsService.update.callCount).to.equal(1);
        chai.expect(settingsService.get.callCount).to.equal(1);

        chai.expect(config.set.callCount).to.equal(1);
        chai.expect(config.set.args[0]).to.deep.equal([{ foo: 'bar' }]);

        chai.expect(config.setTranslationCache.callCount).to.equal(1);
        chai.expect(config.setTranslationCache.args[0]).to.deep.equal([{}]);

        chai.expect(db.createVault.callCount).to.equal(1);
      });
    });

    it('should not crash if getting translation docs is unsuccessful', () => {
      settingsService.update.resolves();
      settingsService.get.resolves({ foo: 'bar' });
      db.medic.get.withArgs('_design/medic').resolves({ _id: '_design/medic' });
      translations.getTranslationDocs.rejects('errors nooo');

      return bootstrap.load().then(() => {
        chai.expect(settingsService.get.callCount).to.equal(1);
        chai.expect(settingsService.update.callCount).to.equal(1);

        chai.expect(db.medic.get.callCount).to.equal(1);
        chai.expect(viewMapUtils.loadViewMaps.callCount).to.equal(1);
        chai.expect(translations.getTranslationDocs.callCount).to.equal(1);

        chai.expect(config.setTranslationCache.callCount).to.equal(0);
      });
    });

    it('should crash if translations are malformed', () => {
      settingsService.get.resolves({ foo: 'bar' });
      db.medic.get.withArgs('_design/medic').resolves({ _id: '_design/medic' });
      translations.getTranslationDocs.resolves([
        { generic: 'something', code: 'en' },
        { custom: 'or other', code: 'fr', values: 'true' },
        { code: 'hi' },
      ]);

      return bootstrap
        .load()
        .then(() => chai.expect.fail('should have crashed'))
        .catch((err) => {
          chai.expect(err).to.be.an.instanceof(TypeError);
        });
    });
  });

  describe('listen', () => {
    beforeEach(() => {
      bootstrap.listen();
    });

    it('initializes the Continuous changes feed', () => {
      chai.expect(db.medic.changes.callCount).to.equal(1);
      chai
        .expect(db.medic.changes.args[0])
        .to.deep.equal([{ live: true, since: 'now', return_docs: false }]);
    });

    it('does nothing for irrelevant change', () => {
      emitChange({ id: 'someDoc' });
      on.callCount.should.equal(2);

      chai.expect(translations.getTranslationDocs.callCount).to.equal(0);
      chai.expect(db.medic.get.callCount).to.equal(0);
    });

    describe('medic ddoc changes', () => {
      it('reloads settings, runs translations', () => {
        settingsService.update.resolves();
        translations.run.resolves();
        db.medic.get.resolves();

        return emitChange({ id: '_design/medic' }).then(() => {
          chai.expect(translations.run.callCount).to.equal(1);
          chai.expect(db.medic.get.callCount).to.equal(1);
          chai.expect(db.medic.get.args[0]).to.deep.equal(['_design/medic']);
          chai.expect(viewMapUtils.loadViewMaps.callCount).to.equal(1);
          chai.expect(generateServiceWorker.run.callCount).to.equal(0);
        });
      });

      it('should catch translations errors', () => {
        translations.run.rejects();
        settingsService.update.resolves();
        db.medic.get.resolves();

        return emitChange({ id: '_design/medic' }).then(() => {
          chai.expect(translations.run.callCount).to.equal(1);
          chai.expect(db.medic.get.callCount).to.equal(1);
        });
      });
    });

    describe('translationsChanges', () => {
      it('reloads translations and generates service worker when translations are updated', () => {
        translations.run.resolves();
        generateServiceWorker.run.resolves();
        translations.getTranslationDocs.resolves([]);

        return emitChange({ id: 'messages-test' }).then(() => {
          chai.expect(translations.run.callCount).to.equal(0);
          chai.expect(generateServiceWorker.run.callCount).to.equal(1);
          chai.expect(db.medic.get.callCount).to.equal(0);

          chai.expect(translations.getTranslationDocs.callCount).to.equal(1);
        });
      });

      it('should catch translations errors', () => {
        translations.run.rejects();
        generateServiceWorker.run.resolves();
        translations.getTranslationDocs.resolves([]);

        return emitChange({ id: 'messages-test' }).then(() => {
          chai.expect(generateServiceWorker.run.callCount).to.equal(1);
          chai.expect(db.medic.get.callCount).to.equal(0);
        });
      });

      it('should terminate process on service worker errors', () => {
        translations.run.resolves();
        generateServiceWorker.run.rejects();
        translations.getTranslationDocs.resolves([]);
        sinon.stub(process, 'exit');

        return emitChange({ id: 'messages-test' }).then(() => {
          chai.expect(process.exit.callCount).to.equal(1);
        });
      });
    });

    describe('branding changes', () => {
      it('generates service worker when branding doc is updated', () => {
        manifest.generate.resolves();
        generateServiceWorker.run.resolves();

        return emitChange({ id: 'branding' }).then(() => {
          chai.expect(generateServiceWorker.run.callCount).to.equal(1);

          chai.expect(translations.run.callCount).to.equal(0);
        });
      });

      it('should terminate process on service worker errors', () => {
        manifest.generate.resolves();
        generateServiceWorker.run.rejects();

        sinon.stub(process, 'exit');

        return emitChange({ id: 'branding' }).then(() => {
          chai.expect(process.exit.callCount).to.equal(1);
        });
      });
    });

    describe('settings changes', () => {
      it('reloads settings settings doc is updated', () => {
        settingsService.update.resolves();
        settingsService.get.resolves({ settings: 'yes' });
        sinon.stub(db, 'addRoleToSecurity');
        sinon.stub(config, 'get').withArgs('roles').returns({ chw: {} });
        sinon.stub(environment, 'db').get(() => 'medicdb');

        return emitChange({ id: 'settings' }).then(() => {
          chai.expect(settingsService.update.callCount).to.equal(1);
          chai.expect(settingsService.get.callCount).to.equal(1);
          chai.expect(config.set.callCount).to.equal(1);
          chai.expect(config.set.args[0]).to.deep.equal([{ settings: 'yes' }]);
          chai.expect(config.get.withArgs('roles').callCount).to.equal(1);
          chai.expect(db.addRoleToSecurity.args).to.deep.equal([['medicdb', 'chw', false]]);
        });
      });

      it('should add all configured user roles to the main database', () => {
        settingsService.update.resolves();
        settingsService.get.resolves({ settings: 'yes' });
        sinon.stub(db, 'addRoleToSecurity');
        sinon.stub(config, 'get')
          .withArgs('roles')
          .returns({
            chw1: {},
            chw2: {},
            chw3: {},
            chw4: {},
          });
        sinon.stub(environment, 'db').get(() => 'medicdb');

        return emitChange({ id: 'settings' }).then(() => {
          chai.expect(settingsService.update.callCount).to.equal(1);
          chai.expect(settingsService.get.callCount).to.equal(1);
          chai.expect(config.set.callCount).to.equal(1);
          chai.expect(config.set.args[0]).to.deep.equal([{ settings: 'yes' }]);
          chai.expect(config.get.withArgs('roles').callCount).to.equal(1);
          chai.expect(db.addRoleToSecurity.args).to.deep.equal([
            ['medicdb', 'chw1', false],
            ['medicdb', 'chw2', false],
            ['medicdb', 'chw3', false],
            ['medicdb', 'chw4', false],
          ]);
        });
      });

      it('should terminate process on settings load errors', () => {
        settingsService.update.resolves();
        settingsService.get.rejects();
        sinon.stub(process, 'exit');

        return emitChange({ id: 'settings' }).then(() => {
          chai.expect(process.exit.callCount).to.equal(1);
        });
      });
    });

    describe('form changes', () => {
      it('handles xform changes', () => {
        sinon.stub(generateXform, 'update').resolves();

        return emitChange({ id: 'form:something:something' }).then(() => {
          chai.expect(generateXform.update.callCount).to.equal(1);
          chai.expect(generateXform.update.args[0]).to.deep.equal(['form:something:something']);
        });
      });

      it('should not terminate the process on form gen errors', () => {
        sinon.stub(generateXform, 'update').rejects();

        return emitChange({ id: 'form:id' }).then(() => {
          chai.expect(generateXform.update.callCount).to.equal(1);
          chai.expect(generateXform.update.args[0]).to.deep.equal(['form:id']);
        });
      });

      it('should handle deletions gracefully - #7608', () => {
        sinon.stub(generateXform, 'update');
        return emitChange({ id: 'form:id', deleted: true }).then(() => {
          chai.expect(generateXform.update.callCount).to.equal(0);
        });
      });

      it('should ignore tombstones - #7608', () => {
        sinon.stub(generateXform, 'update');
        const tombstoneId = 'form:pnc_danger_sign_follow_up_mother____3-336f91959e14966f9baec1c3dd1c7fa2____tombstone';
        return emitChange({ id: tombstoneId }).then(() => {
          chai.expect(generateXform.update.callCount).to.equal(0);
        });
      });
    });

  });
});
