const chai = require('chai');
const path = require('path');
const sinon = require('sinon');
const config = require('../../src/config');
const db = require('../../src/db');
const environment = require('../../src/environment');
const ddocExtraction = require('../../src/ddoc-extraction');
const resourceExtraction = require('../../src/resource-extraction');
const settingsService = require('../../src/services/settings');
const translations = require('../../src/translations');
const viewMapUtils = require('@medic/view-map-utils');

let on;

describe('Config', () => {
  beforeEach(() => {
    on = sinon.stub();
    on.returns({ on: on });

    sinon.stub(db.medic, 'get');
    sinon.stub(db.medic, 'query');
    sinon.stub(db.medic, 'changes').returns({ on: on });
    sinon.stub(viewMapUtils, 'loadViewMaps');
    sinon.stub(ddocExtraction, 'run').resolves();
    sinon.stub(resourceExtraction, 'run').resolves();
    sinon.stub(translations, 'run').resolves();
    sinon.stub(settingsService, 'get').resolves();
    sinon.stub(settingsService, 'update').resolves();
    sinon.stub(environment, 'getExtractedResourcesPath')
      .returns(path.resolve(__dirname, './../../../build/ddocs/medic/_attachments'));
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('load', () => {
    it('loads app settings combining with default config, loads views into ViewMaps, loads translations', () => {
      settingsService.get.resolves({ foo: 'bar' });
      db.medic.get
        .withArgs('_design/medic')
        .callsArgWith(1, null, { _id: '_design/medic' });
      db.medic.query.resolves({ rows: [] });

      return config.load().then(() => {
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

    it('should not crash if getting translation docs is unsuccessful', () => {
      settingsService.get.resolves({ foo: 'bar' });
      db.medic.get.withArgs('_design/medic').callsArgWith(1, null, { _id: '_design/medic' });
      db.medic.query.rejects('errors nooo');

      return config.load().then(() => {
        chai.expect(settingsService.get.callCount).to.equal(1);
        chai.expect(settingsService.update.callCount).to.equal(1);
        chai.expect(db.medic.get.callCount).to.equal(1);
        chai.expect(viewMapUtils.loadViewMaps.callCount).to.equal(1);
        chai.expect(db.medic.query.callCount).to.equal(1);
      });
    });

    it('should crash if translations are malformed', () => {
      settingsService.get.resolves({ foo: 'bar' });
      db.medic.get.withArgs('_design/medic').callsArgWith(1, null, { _id: '_design/medic' });
      db.medic.query.resolves({
        rows: [
          { doc: { generic: 'something', code: 'en' }},
          { doc: { custom: 'or other', code: 'fr', values: 'true' }},
          { doc: { code: 'hi' }}
        ]
      });

      return config
        .load()
        .then(() => chai.expect(true).to.equal('should have crashed'))
        .catch((err) => {
          chai.expect(err).to.be.an.instanceof(TypeError);
        });
    });
  });

  describe('listen', () => {
    it('initializes the Continuous changes feed', () => {
      config.listen();
      chai.expect(db.medic.changes.callCount).to.equal(1);
      chai
        .expect(db.medic.changes.args[0])
        .to.deep.equal([{ live: true, since: 'now', return_docs: false }]);
    });

    it('does nothing for irrelevant change', () => {
      config.listen();
      const change = { id: 'someDoc' };
      on.callCount.should.equal(2);
      const changeCallback = on.args[0][1];

      changeCallback(change);
      chai.expect(db.medic.query.callCount).to.equal(0);
      chai.expect(db.medic.get.callCount).to.equal(0);
    });

    it('reloads settings, runs translations and ddoc extraction when _design/medic is updated', () => {
      config.listen();
      const change = { id: '_design/medic' };
      const changeCallback = on.args[0][1];
      changeCallback(change);
      chai.expect(translations.run.callCount).to.equal(1);
      chai.expect(ddocExtraction.run.callCount).to.equal(1);
      chai.expect(resourceExtraction.run.callCount).to.equal(1);
      chai.expect(db.medic.get.callCount).to.equal(1);
      chai.expect(db.medic.get.args[0][0]).to.equal('_design/medic');
    });

    it('reloads translations when translations are updated', () => {
      config.listen();
      db.medic.query.resolves({ rows: [] });
      const change = { id: 'messages-test' };
      const changeCallback = on.args[0][1];
      changeCallback(change);
      chai.expect(translations.run.callCount).to.equal(0);
      chai.expect(ddocExtraction.run.callCount).to.equal(0);
      chai.expect(resourceExtraction.run.callCount).to.equal(0);
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

  describe('translate', () => {

    describe('with object key', () => {

      it('finds requested locale', () => {
        const given = { translations: [
          { locale: 'en', content: 'english' },
          { locale: 'fr', content: 'french' }
        ] };
        const actual = config.translate(given, 'fr');
        chai.expect(actual).to.equal('french');
      });

      it('uses provided default', () => {
        const given = { default: 'def', translations: [
          { locale: 'en', content: 'english' },
          { locale: 'fr', content: 'french' }
        ] };
        const actual = config.translate(given, 'xx');
        chai.expect(actual).to.equal('def');
      });

      it('defaults to english', () => {
        const given = { translations: [
          { locale: 'fr', content: 'french' },
          { locale: 'en', content: 'english' }
        ] };
        const actual = config.translate(given, 'xx');
        chai.expect(actual).to.equal('english');
      });

      it('returns first available language', () => {
        const given = { translations: [
          { locale: 'es', content: 'spanish' },
          { locale: 'fr', content: 'french' }
        ] };
        const actual = config.translate(given, 'xx');
        chai.expect(actual).to.equal('spanish');
      });

    });

    describe('with string key', () => {

      beforeEach(() => {
        config.listen();
        db.medic.query.resolves({ rows: [
          { doc: { code: 'en', generic: {
            'test.key': 'english value',
            'test.key2': 'another value',
            'templated': 'hello {{name}}'
          } } },
          { doc: { code: 'fr', generic: {
            'test.key': 'french value'
          } } }
        ] });
        const change = { id: 'messages-test' };
        const changeCallback = on.args[0][1];
        return changeCallback(change);
      });

      it('returns key when no value found', () => {
        const actual = config.translate('not-found');
        chai.expect(actual).to.equal('not-found');
      });

      it('defaults to english when no locale given or configured', () => {
        const actual = config.translate('test.key');
        chai.expect(actual).to.equal('english value');
      });

      it('defaults to english when given locale not found', () => {
        const actual = config.translate('test.key', 'xx');
        chai.expect(actual).to.equal('english value');
      });

      it('defaults to english when local value not found', () => {
        const actual = config.translate('test.key2');
        chai.expect(actual).to.equal('another value');
      });

      it('returns requested locale when available', () => {
        const actual = config.translate('test.key', 'fr');
        chai.expect(actual).to.equal('french value');
      });

      it('templates value using the context', () => {
        const actual = config.translate('templated', 'en', { name: 'jones' });
        chai.expect(actual).to.equal('hello jones');
      });

      it('handles templating errors from missing variables', () => {
        const actual = config.translate('templated', 'en', { });
        chai.expect(actual).to.equal('hello {{name}}');
      });

    });

  });

  describe('getTranslationValues', () => {

    beforeEach(() => {
      config.listen();
      db.medic.query.resolves({ rows: [
        { doc: { code: 'en', generic: {
          'test.key': 'english value',
          'test.key2': 'another value',
          'test.key3': 'third value'
        } } },
        { doc: { code: 'fr', generic: {
          'test.key': 'french value'
        } } }
      ] });
      const change = { id: 'messages-test' };
      const changeCallback = on.args[0][1];
      return changeCallback(change);
    });

    it('returns map of values for given keys for all locales', () => {
      const actual = config.getTranslationValues([ 'test.key', 'test.key2' ]);
      chai.expect(actual).to.deep.equal({
        'fr': {
          'test.key': 'french value',
          'test.key2': undefined
        },
        'en': {
          'test.key': 'english value',
          'test.key2': 'another value'
        }
      });
    });

  });

});
