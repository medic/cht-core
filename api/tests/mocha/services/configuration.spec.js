const chai = require('chai');
const sinon = require('sinon');
const path = require('path');

const viewMapUtils = require('@medic/view-map-utils');
const db = require('../../../src/db');
const environment = require('../../../src/environment');
const ddocExtraction = require('../../../src/ddoc-extraction');
const resourceExtraction = require('../../../src/resource-extraction');
const settingsService = require('../../../src/services/settings');
const translations = require('../../../src/translations');
const generateServiceWorker = require('../../../src/generate-service-worker');
const generateXform = require('../../../src/services/generate-xform');
const config = require('../../../src/config');
const configuration = require('../../../src/services/configuration');

const nextTick = () => new Promise(r => setTimeout(r));
let on;

describe('Configuration', () => {
  beforeEach(() => {
    on = sinon.stub();
    on.returns({ on: on });

    sinon.stub(db.medic, 'get');
    sinon.stub(db.medic, 'query');
    sinon.stub(db.medic, 'changes').returns({ on: on });
    sinon.stub(viewMapUtils, 'loadViewMaps');
    sinon.stub(ddocExtraction, 'run');
    sinon.stub(resourceExtraction, 'run');
    sinon.stub(translations, 'run');
    sinon.stub(settingsService, 'get');
    sinon.stub(settingsService, 'update');
    sinon.stub(generateServiceWorker, 'run');
    sinon.stub(environment, 'getExtractedResourcesPath')
      .returns(path.resolve(__dirname, './../../../../build/ddocs/medic/_attachments'));
    sinon.spy(config, 'set');
    sinon.spy(config, 'setTranslationCache');
    sinon.spy(config, 'setTransitionsLib');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('load', () => {
    it('loads app settings combining with default config, loads views into ViewMaps, loads translations', () => {
      settingsService.update.resolves();
      settingsService.get.resolves({ foo: 'bar' });
      db.medic.get.withArgs('_design/medic').resolves({ _id: '_design/medic' });
      db.medic.query.resolves({ rows: [] });

      return configuration.load().then(() => {
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
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.query.args[0]).to.deep.equal([
          'medic-client/doc_by_type',
          { key: ['translations', true], include_docs: true },
        ]);

        chai.expect(settingsService.update.callCount).to.equal(1);
        chai.expect(settingsService.get.callCount).to.equal(1);

        chai.expect(config.set.callCount).to.equal(1);
        chai.expect(config.set.args[0]).to.deep.equal([{ foo: 'bar' }]);

        chai.expect(config.setTranslationCache.callCount).to.equal(1);
        chai.expect(config.setTranslationCache.args[0]).to.deep.equal([{}]);
      });
    });

    it('should not crash if getting translation docs is unsuccessful', () => {
      settingsService.update.resolves();
      settingsService.get.resolves({ foo: 'bar' });
      db.medic.get.withArgs('_design/medic').resolves({ _id: '_design/medic' });
      db.medic.query.rejects('errors nooo');

      return configuration.load().then(() => {
        chai.expect(settingsService.get.callCount).to.equal(1);
        chai.expect(settingsService.update.callCount).to.equal(1);

        chai.expect(db.medic.get.callCount).to.equal(1);
        chai.expect(viewMapUtils.loadViewMaps.callCount).to.equal(1);
        chai.expect(db.medic.query.callCount).to.equal(1);

        chai.expect(config.setTranslationCache.callCount).to.equal(0);
      });
    });

    it('should crash if translations are malformed', () => {
      settingsService.get.resolves({ foo: 'bar' });
      db.medic.get.withArgs('_design/medic').resolves({ _id: '_design/medic' });
      db.medic.query.resolves({
        rows: [
          { doc: { generic: 'something', code: 'en' }},
          { doc: { custom: 'or other', code: 'fr', values: 'true' }},
          { doc: { code: 'hi' }}
        ]
      });

      return configuration
        .load()
        .then(() => chai.expect.fail('should have crashed'))
        .catch((err) => {
          chai.expect(err).to.be.an.instanceof(TypeError);
        });
    });
  });

  describe('listen', () => {
    it('initializes the Continuous changes feed', () => {
      configuration.listen();
      chai.expect(db.medic.changes.callCount).to.equal(1);
      chai
        .expect(db.medic.changes.args[0])
        .to.deep.equal([{ live: true, since: 'now', return_docs: false }]);
    });

    it('does nothing for irrelevant change', () => {
      configuration.listen();
      const change = { id: 'someDoc' };
      on.callCount.should.equal(2);
      const changeCallback = on.args[0][1];

      changeCallback(change);
      chai.expect(db.medic.query.callCount).to.equal(0);
      chai.expect(db.medic.get.callCount).to.equal(0);
    });

    it('reloads settings, runs translations, ddoc extraction and generates sw when _design/medic is updated', () => {
      settingsService.update.resolves();
      ddocExtraction.run.resolves();
      resourceExtraction.run.resolves();
      translations.run.resolves();
      generateServiceWorker.run.resolves();

      configuration.listen();
      db.medic.get.resolves();
      const change = { id: '_design/medic' };
      const changeCallback = on.args[0][1];
      changeCallback(change);
      return nextTick().then(() => {
        chai.expect(translations.run.callCount).to.equal(1);
        chai.expect(ddocExtraction.run.callCount).to.equal(1);
        chai.expect(resourceExtraction.run.callCount).to.equal(1);
        chai.expect(generateServiceWorker.run.callCount).to.equal(1);
        chai.expect(db.medic.get.callCount).to.equal(1);
        chai.expect(db.medic.get.args[0]).to.deep.equal(['_design/medic']);
      });
    });

    it('reloads translations and generates service worker when translations are updated', () => {
      translations.run.resolves();
      generateServiceWorker.run.resolves();

      configuration.listen();
      db.medic.query.resolves({ rows: [] });
      const change = { id: 'messages-test' };
      const changeCallback = on.args[0][1];
      changeCallback(change);
      return nextTick().then(() => {
        chai.expect(translations.run.callCount).to.equal(0);
        chai.expect(ddocExtraction.run.callCount).to.equal(0);
        chai.expect(resourceExtraction.run.callCount).to.equal(0);
        chai.expect(generateServiceWorker.run.callCount).to.equal(1);
        chai.expect(db.medic.get.callCount).to.equal(0);

        chai.expect(db.medic.query.callCount).to.equal(1);
        chai
          .expect(
            db.medic.query.withArgs('medic-client/doc_by_type', {
              key: ['translations', true],
              include_docs: true,
            }).callCount
          )
          .to.equal(1);
      });
    });

    it('generates service worker when branding doc is updated', () => {
      generateServiceWorker.run.resolves();

      configuration.listen();
      const change = { id: 'branding' };
      const changeCallback = on.args[0][1];
      changeCallback(change);
      return nextTick().then(() => {
        chai.expect(generateServiceWorker.run.callCount).to.equal(1);

        chai.expect(translations.run.callCount).to.equal(0);
        chai.expect(ddocExtraction.run.callCount).to.equal(0);
        chai.expect(resourceExtraction.run.callCount).to.equal(0);
      });
    });

    it('reloads settings and transitions library when settings doc is updated', () => {
      configuration.listen();
      settingsService.update.resolves();
      settingsService.get.resolves({ settings: 'yes' });

      const change = { id: 'settings' };
      const changeCallback = on.args[0][1];
      changeCallback(change);

      return nextTick().then(() => {
        chai.expect(settingsService.update.callCount).to.equal(1);
        chai.expect(settingsService.get.callCount).to.equal(1);
        chai.expect(config.set.callCount).to.equal(1);
        chai.expect(config.set.args[0]).to.deep.equal([{ settings: 'yes' }]);
      });
    });

    it('handles xform changes', () => {
      configuration.listen();
      sinon.stub(generateXform, 'update').resolves();
      const change = { id: 'form:something:something' };
      const changeCallback = on.args[0][1];
      changeCallback(change);

      return nextTick().then(() => {
        chai.expect(generateXform.update.callCount).to.equal(1);
        chai.expect(generateXform.update.args[0]).to.deep.equal(['form:something:something']);
      });
    });
  });
});
