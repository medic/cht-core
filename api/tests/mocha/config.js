const config = require('../../src/config'),
      sinon = require('sinon').sandbox.create(),
      db = require('../../src/db-nano'),
      ddocExtraction = require('../../src/ddoc-extraction'),
      translations = require('../../src/translations'),
      settingsService = require('../../src/services/settings'),
      viewMapUtils = require('@shared-libs/view-map-utils'),
      defaults = require('../../src/config.default.json'),
      _ = require('underscore'),
      follow = require('follow'),
      chai = require('chai');

let changeCallback,
    feed;

describe('Config', () => {
  beforeEach(() => {
    feed = {
      follow: sinon.stub(),
      on: sinon.stub().withArgs('change').callsFake((event, fn) => {
        changeCallback = fn;
      })
    };
    sinon.stub(db.medic, 'get');
    sinon.stub(db.medic, 'view');
    sinon.stub(viewMapUtils, 'loadViewMaps');
    sinon.stub(ddocExtraction, 'run').resolves();
    sinon.stub(translations, 'run');
    sinon.stub(settingsService, 'get').resolves();
    sinon.stub(settingsService, 'update').resolves();
    sinon.stub(follow, 'Feed').returns(feed);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('load', () => {
    it('calls back with error when db errors', () => {
      settingsService.get.rejects('someError');
      config.load((err) => {
        chai.expect(err).to.equal('someError');
        chai.expect(settingsService.update.callCount).to.equal(0);
      });
    });

    it('loads app settings combining with default config, loads views into ViewMaps, loads translations', (done) => {
      settingsService.get.resolves({ foo: 'bar' });
      db.medic.get
        .withArgs('_design/medic')
        .callsArgWith(1, null, { _id: '_design/medic' });

      config.load((err) => {
        chai.expect(err).to.equal(undefined);
        chai.expect(settingsService.get.callCount).to.equal(1);
        chai.expect(settingsService.update.callCount).to.equal(1);
        chai.expect(settingsService.update.args[0][0]).to.deep.equal(_.extend({ foo: 'bar' }, defaults));

        setTimeout(() => {
          chai.expect(db.medic.get.callCount).to.equal(1);
          chai.expect(db.medic.get.args[0][0]).to.equal('_design/medic');
          chai.expect(viewMapUtils.loadViewMaps.callCount).to.equal(1);
          chai.expect(viewMapUtils.loadViewMaps.args[0])
            .to.deep.equal([ { _id: '_design/medic' }, 'docs_by_replication_key', 'contacts_by_depth' ]);
          chai.expect(db.medic.view.callCount).to.equal(1);
          chai.expect(db.medic.view
            .withArgs('medic-client', 'doc_by_type', { key: [ 'translations', true ], include_docs: true })
            .callCount).to.equal(1);
          done();
        });
      });
    });

    it('does not update ddoc if no changes are detected', () => {
      const ddoc = {
        _id: '_design/medic',
        app_settings: defaults
      };

      settingsService.get.resolves(defaults);

      db.medic.get
        .withArgs('_design/medic')
        .callsArgWith(1, null, ddoc);

      config.load((err) => {
        chai.expect(err).to.equal(undefined);
        chai.expect(db.medic.get.callCount).to.equal(1);
        chai.expect(db.medic.get.args[0][0]).to.equal('_design/medic');
        chai.expect(settingsService.update.callCount).to.equal(0);
      });
    });
  });

  describe('listen', () => {
    it('initializes the feed', () => {
      config.listen();
      chai.expect(follow.Feed.callCount).to.equal(1);
      chai.expect(follow.Feed.args[0]).to.deep.equal([{ db: process.env.COUCH_URL, since: 'now' }]);
      chai.expect(feed.follow.callCount).to.equal(1);
    });

    it('does nothing for irrelevant change', () => {
      config.listen();
      const change = { id: 'someDoc' };
      changeCallback(change);
      chai.expect(db.medic.view.callCount).to.equal(0);
      chai.expect(db.medic.get.callCount).to.equal(0);
    });

    it('reloads settings, runs translations and ddoc extraction when _design/medic is updated', () => {
      config.listen();
      const change = { id: '_design/medic' };
      changeCallback(change);
      chai.expect(translations.run.callCount).to.equal(1);
      chai.expect(ddocExtraction.run.callCount).to.equal(1);
      chai.expect(db.medic.get.callCount).to.equal(1);
      chai.expect(db.medic.get.args[0][0]).to.equal('_design/medic');
    });

    it('reloads translations when translations are updated', () => {
      config.listen();
      const change = { id: 'messages-test' };
      changeCallback(change);
      chai.expect(translations.run.callCount).to.equal(0);
      chai.expect(ddocExtraction.run.callCount).to.equal(0);
      chai.expect(db.medic.get.callCount).to.equal(0);

      chai.expect(db.medic.view.callCount).to.equal(1);
      chai.expect(db.medic.view.withArgs('medic-client', 'doc_by_type', { key: [ 'translations', true ], include_docs: true }).callCount).to.equal(1);
    });
  });
});
