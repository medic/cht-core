const config = require('../../src/config'),
  sinon = require('sinon'),
  db = require('../../src/db-pouch'),
  logger = require('../../src/logger'),
  ddocExtraction = require('../../src/ddoc-extraction'),
  translations = require('../../src/translations'),
  settingsService = require('../../src/services/settings'),
  viewMapUtils = require('@shared-libs/view-map-utils'),
  defaults = require('../../src/config.default.json'),
  _ = require('underscore'),
  chai = require('chai');

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
    sinon.stub(translations, 'run').resolves();
    sinon.stub(settingsService, 'get').resolves();
    sinon.stub(settingsService, 'update').resolves();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('load', () => {
    it('calls back with error when db errors', () => {
      settingsService.get.returns(Promise.reject('someError'));
      return config.load().catch(err => {
        chai.expect(err).to.equal('someError');
        chai.expect(settingsService.update.callCount).to.equal(0);
      });
    });

    it('loads app settings combining with default config, loads views into ViewMaps, loads translations', done => {
      settingsService.get.resolves({ foo: 'bar' });
      db.medic.get
        .withArgs('_design/medic')
        .callsArgWith(1, null, { _id: '_design/medic' });

      config.load().then(() => {
        chai.expect(settingsService.get.callCount).to.equal(1);
        chai.expect(settingsService.update.callCount).to.equal(1);
        chai
          .expect(settingsService.update.args[0][0])
          .to.deep.equal(_.extend({ foo: 'bar' }, defaults));

        setTimeout(() => {
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
          done();
        });
      });
    });

    it('does not update ddoc if no changes are detected', () => {
      const ddoc = {
        _id: '_design/medic',
        app_settings: defaults,
      };

      settingsService.get.resolves(defaults);

      db.medic.get.withArgs('_design/medic').callsArgWith(1, null, ddoc);

      return config.load().then(() => {
        chai.expect(db.medic.get.callCount).to.equal(1);
        chai.expect(db.medic.get.args[0][0]).to.equal('_design/medic');
        chai.expect(settingsService.update.callCount).to.equal(0);
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

      logger.info(changeCallback);
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
      chai.expect(db.medic.get.callCount).to.equal(1);
      chai.expect(db.medic.get.args[0][0]).to.equal('_design/medic');
    });

    it('reloads translations when translations are updated', () => {
      config.listen();
      const change = { id: 'messages-test' };
      const changeCallback = on.args[0][1];
      changeCallback(change);
      chai.expect(translations.run.callCount).to.equal(0);
      chai.expect(ddocExtraction.run.callCount).to.equal(0);
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
});
