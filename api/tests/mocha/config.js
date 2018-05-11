const config = require('../../src/config'),
      sinon = require('sinon').sandbox.create(),
      db = require('../../src/db-nano'),
      ddocExtraction = require('../../src/ddoc-extraction'),
      translations = require('../../src/translations'),
      settingsService = require('../../src/services/settings'),
      viewMapUtils = require('@shared-libs/view-map-utils'),
      defaults = require('../../src/config.default.json'),
      chai = require('chai'),
      _ = require('underscore'),
      follow = require('follow');

require('chai').should();
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
    sinon.stub(ddocExtraction, 'run');
    sinon.stub(translations, 'run');
    sinon.stub(settingsService, 'update').resolves();
    sinon.stub(follow, 'Feed').returns(feed);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('load', () => {
    it('calls back with error when db errors', () => {
      db.medic.get
        .withArgs('_design/medic')
        .callsArgWith(1, 'someError');

      config.load((err) => {
        err.should.equal('someError');
        viewMapUtils.loadViewMaps.callCount.should.equal(0);
        settingsService.update.callCount.should.equal(0);
      });
    });

    it('loads app settings from medic ddoc, combining with default config, loads views into ViewMaps', () => {
      const ddoc = {
        _id: '_design/medic',
        app_settings: {
          foo: 'bar'
        }
      };
      db.medic.get
        .withArgs('_design/medic')
        .callsArgWith(1, null, ddoc);

      config.load((err) => {
        chai.expect(err).to.equal(undefined);
        db.medic.get.callCount.should.equal(1);
        db.medic.get.args[0][0].should.equal('_design/medic');

        viewMapUtils.loadViewMaps.callCount.should.equal(1);
        viewMapUtils.loadViewMaps.args[0].should.deep.equal([ ddoc, 'docs_by_replication_key', 'contacts_by_depth' ]);

        settingsService.update.callCount.should.equal(1);
        settingsService.update.args[0][0].should.deep.equal(_.extend(ddoc.app_settings, defaults));
      });
    });

    it('does not update ddoc if no changes are detected', () => {
      const ddoc = {
        _id: '_design/medic',
        app_settings: defaults
      };
      db.medic.get
        .withArgs('_design/medic')
        .callsArgWith(1, null, ddoc);

      config.load((err) => {
        chai.expect(err).to.equal(undefined);
        db.medic.get.callCount.should.equal(1);
        db.medic.get.args[0][0].should.equal('_design/medic');
        settingsService.update.callCount.should.equal(0);
      });
    });
  });

  describe('listen', () => {
    it('initializes the feed', () => {
      config.listen();
      follow.Feed.callCount.should.equal(1);
      follow.Feed.args[0].should.deep.equal([{ db: process.env.COUCH_URL, since: 'now' }]);
      feed.follow.callCount.should.equal(1);
    });

    it('does nothing for irrelevant change', () => {
      config.listen();
      const change = { id: 'someDoc' };
      changeCallback(change);
      db.medic.view.callCount.should.equal(0);
      db.medic.get.callCount.should.equal(0);
    });

    it('reloads settings, runs translations and ddoc extraction when _design/medic is updated', () => {
      config.listen();
      const change = { id: '_design/medic' };
      changeCallback(change);
      translations.run.callCount.should.equal(1);
      ddocExtraction.run.callCount.should.equal(1);
      db.medic.get.callCount.should.equal(1);
      db.medic.get.args[0][0].should.equal('_design/medic');
    });

    it('reloads translations when translations are updated', () => {
      config.listen();
      const change = { id: 'messages-test' };
      changeCallback(change);
      translations.run.callCount.should.equal(0);
      ddocExtraction.run.callCount.should.equal(0);
      db.medic.get.callCount.should.equal(0);

      db.medic.view.callCount.should.equal(1);
      db.medic.view.args[0].slice(0, -1).should.deep.equal([
        'medic-client', 'doc_by_type',
        { key: [ 'translations', true ], include_docs: true }
      ]);
    });
  });
});
