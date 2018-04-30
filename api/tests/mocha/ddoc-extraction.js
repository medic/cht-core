const ddocExtraction = require('../../src/ddoc-extraction'),
      sinon = require('sinon').sandbox.create(),
      db = require('../../src/db-nano'),
      chai = require('chai');

require('chai').should();

describe('DDoc extraction', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('finds all attached ddocs and, if required, updates them', done => {
    const get = sinon.stub(db.medic, 'get');

    const attachment = { docs: [
      { _id: '_design/new', views: { doc_by_place: { map: 'function() { return true; }' } } },
      { _id: '_design/updated', views: { doc_by_valid: { map: 'function() { return true; }' } } },
      { _id: '_design/unchanged', views: { doc_by_valid: { map: 'function() { return true; }' } } },
    ] };
    const ddoc = {
      _id: '_design/medic',
      _attachments: {
        'manifest.appcache': {
          content_type: 'text/cache-manifest',
          revpos: 2730,
          digest: 'md5-JRYByZdYixaFg3a4L6X0pw==',
          length: 1224,
          stub: true
        }
      },
      app_settings: { setup_complete: true }
    };

    const getDdoc = get.withArgs('_design/medic').callsArgWith(1, null, ddoc);
    const getAttachment = get.withArgs('_design/medic/ddocs/compiled.json').callsArgWith(1, null, attachment);
    const getNew = get.withArgs('_design/new').callsArgWith(2, { error: 'not_found' });
    const getUpdated = get.withArgs('_design/updated').callsArgWith(2, null, { _id: '_design/updated', _rev: '1', views: { doc_by_valed: { map: 'function() { return true; }' } } });
    const getUnchanged = get.withArgs('_design/unchanged').callsArgWith(2, null, { _id: '_design/unchanged', _rev: '1', views: { doc_by_valid: { map: 'function() { return true; }' } } });
    const getAppcache = get.withArgs('appcache').callsArgWith(1, null, { digest: 'md5-JRYByZdYixaFg3a4L6X0pw==' });
    const bulk = sinon.stub(db.medic, 'bulk').callsArg(1);

    ddocExtraction.run(err => {
      chai.expect(err).to.equal(undefined);
      getDdoc.callCount.should.equal(1);
      getAttachment.callCount.should.equal(1);
      getNew.callCount.should.equal(1);
      getUpdated.callCount.should.equal(1);
      getUnchanged.callCount.should.equal(1);
      getAppcache.callCount.should.equal(1);
      bulk.callCount.should.equal(1);
      const docs = bulk.args[0][0].docs;
      docs[0]._id.should.equal('_design/new');
      chai.expect(docs[0]._rev).to.equal(undefined);
      docs[1]._id.should.equal('_design/updated');
      docs[1]._rev.should.equal('1');
      done();
    });
  });

  it('checks attachment data', done => {
    const get = sinon.stub(db.medic, 'get');

    const unchangedData1 = 'some data';
    const unchangedData2 = 'some more data';
    const changedData1 = 'some further data';
    const changedData2 = 'the last of the data';

    const attachment = { docs: [
      {
        _id: '_design/updated',
        _attachments: {
          'main.css': {
            'content_type': 'text/css',
            'data': changedData1
          },
          'main.js': {
            'content_type': 'application/javascript',
            'data': changedData2
          }
        }
      },
      {
        _id: '_design/unchanged',
        _attachments: {
          'main.css': {
            'content_type': 'text/css',
            'data': unchangedData1
          },
          'main.js': {
            'content_type': 'application/javascript',
            'data': unchangedData2
          }
        }
      },
    ] };
    const ddoc = {
      _id: '_design/medic',
      _attachments: {
        'manifest.appcache': {
          content_type: 'text/cache-manifest',
          revpos: 2730,
          digest: 'md5-JRYByZdYixaFg3a4L6X0pw==',
          length: 1224,
          stub: true
        }
      },
      app_settings: { setup_complete: true }
    };

    const getDdoc = get.withArgs('_design/medic').callsArgWith(1, null, ddoc);
    const getAttachment = get.withArgs('_design/medic/ddocs/compiled.json').callsArgWith(1, null, attachment);
    const getUpdated = get.withArgs('_design/updated').callsArgWith(2, null, {
      _id: '_design/updated',
      _rev: '1',
      _attachments: {
        'main.css': {
          'content_type': 'text/css',
          'revpos': 442,
          'digest': 'md5-GuGMKFfYIWFhkG0apv8qYg==',
          'length': 201807,
          'data': changedData1
        },
        'main.js': {
          'content_type': 'application/javascript',
          'revpos': 442,
          'digest': 'md5-fuGMKFfYIWFhkG0apv8qYg==',
          'length': 12688851,
          'data': 'SOMETHING NEW'
        }
      }
    });
    const getUnchanged = get.withArgs('_design/unchanged').callsArgWith(2, null, {
      _id: '_design/unchanged',
      _rev: '1',
      _attachments: {
        'main.css': {
          'content_type': 'text/css',
          'revpos': 442,
          'digest': 'md5-auGMKFfYIWFhkG0apv8qYg==',
          'length': 201807,
          'data': unchangedData1
        },
        'main.js': {
          'content_type': 'application/javascript',
          'revpos': 442,
          'digest': 'md5-buGMKFfYIWFhkG0apv8qYg==',
          'length': 12688851,
          'data': unchangedData2
        }
      }
    });
    const getAppcache = get.withArgs('appcache').callsArgWith(1, null, { digest: 'md5-JRYByZdYixaFg3a4L6X0pw==' });
    const bulk = sinon.stub(db.medic, 'bulk').callsArg(1);

    ddocExtraction.run(err => {
      chai.expect(err).to.equal(undefined);
      getDdoc.callCount.should.equal(1);
      getAttachment.callCount.should.equal(1);
      getUpdated.callCount.should.equal(1);
      getUnchanged.callCount.should.equal(1);
      getAppcache.callCount.should.equal(1);
      bulk.callCount.should.equal(1);
      const docs = bulk.args[0][0].docs;
      docs.length.should.equal(1);
      docs[0]._id.should.equal('_design/updated');
      docs[0]._rev.should.equal('1');
      done();
    });
  });

  it('works when the compiled ddocs is not found', done => {
    const ddoc = {
      _id: '_design/medic',
      _attachments: {
        'manifest.appcache': {
          content_type: 'text/cache-manifest',
          revpos: 2730,
          digest: 'md5-JRYByZdYixaFg3a4L6X0pw==',
          length: 1224,
          stub: true
        }
      },
      app_settings: { setup_complete: true }
    };
    const get = sinon.stub(db.medic, 'get');
    const getDdoc = get.withArgs('_design/medic').callsArgWith(1, null, ddoc);
    const getAttachment = get.withArgs('_design/medic/ddocs/compiled.json').callsArgWith(1, { error: 'not_found' });
    const getAppcache = get.withArgs('appcache').callsArgWith(1, null, { digest: 'md5-JRYByZdYixaFg3a4L6X0pw==' });
    ddocExtraction.run(err => {
      chai.expect(err).to.equal(undefined);
      getDdoc.callCount.should.equal(1);
      getAttachment.callCount.should.equal(1);
      getAppcache.callCount.should.equal(1);
      done();
    });
  });

  it('adds app_settings to medic-client ddoc', done => {
    const get = sinon.stub(db.medic, 'get');

    const attachment = { docs: [
      { _id: '_design/medic-client', views: { doc_by_valid: { map: 'function() { return true; }' } } },
      { _id: '_design/something-else', views: { doc_by_valid: { map: 'function() { return true; }' } } },
    ] };
    const ddoc = {
      _id: '_design/medic',
      _attachments: {
        'manifest.appcache': {
          content_type: 'text/cache-manifest',
          revpos: 2730,
          digest: 'md5-JRYByZdYixaFg3a4L6X0pw==',
          length: 1224,
          stub: true
        }
      },
      app_settings: { setup_complete: true }
    };
    const existingClient = {
      _id: '_design/medic-client',
      _rev: '2',
      app_settings: { setup_complete: false },
      views: { doc_by_valid: { map: 'function() { return true; }' } }
    };

    const getDdoc = get.withArgs('_design/medic').callsArgWith(1, null, ddoc);
    const getAttachment = get.withArgs('_design/medic/ddocs/compiled.json').callsArgWith(1, null, attachment);
    const getClient = get.withArgs('_design/medic-client').callsArgWith(2, null, existingClient);
    const getOther = get.withArgs('_design/something-else').callsArgWith(2, { error: 'not_found' });
    const getAppcache = get.withArgs('appcache').callsArgWith(1, null, { digest: 'md5-JRYByZdYixaFg3a4L6X0pw==' });
    const bulk = sinon.stub(db.medic, 'bulk').callsArg(1);

    ddocExtraction.run(err => {
      chai.expect(err).to.equal(undefined);
      getDdoc.callCount.should.equal(1);
      getAttachment.callCount.should.equal(1);
      getClient.callCount.should.equal(1);
      getOther.callCount.should.equal(1);
      getAppcache.callCount.should.equal(1);
      bulk.callCount.should.equal(1);
      const docs = bulk.args[0][0].docs;
      docs[0]._id.should.equal('_design/medic-client');
      docs[0]._rev.should.equal('2');
      docs[0].app_settings.setup_complete.should.equal(true);
      docs[1]._id.should.equal('_design/something-else');
      chai.expect(docs[1].app_settings).to.equal(undefined);
      done();
    });
  });

  it('updates appcache doc when not found', done => {
    const get = sinon.stub(db.medic, 'get');

    const ddocAttachment = { docs: [
      { _id: '_design/medic-client', views: { doc_by_valid: { map: 'function() { return true; }' } } }
    ] };
    const ddoc = {
      _id: '_design/medic',
      _attachments: {
        'manifest.appcache': {
          content_type: 'text/cache-manifest',
          revpos: 2730,
          digest: 'md5-JRYByZdYixaFg3a4L6X0pw==',
          length: 1224,
          stub: true
        }
      },
      app_settings: { setup_complete: true }
    };
    const existingClient = {
      _id: '_design/medic-client',
      _rev: '2',
      app_settings: { setup_complete: false },
      views: { doc_by_valid: { map: 'function() { return true; }' } }
    };

    const getDdoc = get.withArgs('_design/medic').callsArgWith(1, null, ddoc);
    const getDdocAttachment = get.withArgs('_design/medic/ddocs/compiled.json').callsArgWith(1, null, ddocAttachment);
    const getAppcache = get.withArgs('appcache').callsArgWith(1, { error: 'not_found' });
    const getClient = get.withArgs('_design/medic-client').callsArgWith(2, null, existingClient);
    const bulk = sinon.stub(db.medic, 'bulk').callsArg(1);

    ddocExtraction.run(err => {
      chai.expect(err).to.equal(undefined);
      getDdoc.callCount.should.equal(1);
      getDdocAttachment.callCount.should.equal(1);
      getAppcache.callCount.should.equal(1);
      getClient.callCount.should.equal(1);
      bulk.callCount.should.equal(1);
      const docs = bulk.args[0][0].docs;
      docs[0]._id.should.equal('_design/medic-client');
      docs[0]._rev.should.equal('2');
      docs[0].app_settings.setup_complete.should.equal(true);
      docs[1]._id.should.equal('appcache');
      chai.expect(docs[1]._rev).to.equal(undefined);
      docs[1].digest.should.equal('md5-JRYByZdYixaFg3a4L6X0pw==');
      done();
    });
  });

  it('updates appcache doc when out of date', done => {
    const get = sinon.stub(db.medic, 'get');

    const ddocAttachment = { docs: [
      { _id: '_design/medic-client', views: { doc_by_valid: { map: 'function() { return true; }' } } }
    ] };
    const ddoc = {
      _id: '_design/medic',
      _attachments: {
        'manifest.appcache': {
          content_type: 'text/cache-manifest',
          revpos: 2730,
          digest: 'md5-JRYByZdYixaFg3a4L6X0pw==',
          length: 1224,
          stub: true
        }
      },
      app_settings: { setup_complete: true }
    };
    const existingClient = {
      _id: '_design/medic-client',
      _rev: '2',
      app_settings: { setup_complete: false },
      views: { doc_by_valid: { map: 'function() { return true; }' } }
    };
    const appcache = {
      _id: 'appcache',
      _rev: '5',
      digest: 'md5-different=='
    };

    const getDdoc = get.withArgs('_design/medic').callsArgWith(1, null, ddoc);
    const getDdocAttachment = get.withArgs('_design/medic/ddocs/compiled.json').callsArgWith(1, null, ddocAttachment);
    const getAppcache = get.withArgs('appcache').callsArgWith(1, null, appcache);
    const getClient = get.withArgs('_design/medic-client').callsArgWith(2, null, existingClient);
    const bulk = sinon.stub(db.medic, 'bulk').callsArg(1);

    ddocExtraction.run(err => {
      chai.expect(err).to.equal(undefined);
      getDdoc.callCount.should.equal(1);
      getDdocAttachment.callCount.should.equal(1);
      getAppcache.callCount.should.equal(1);
      getClient.callCount.should.equal(1);
      bulk.callCount.should.equal(1);
      const docs = bulk.args[0][0].docs;
      docs[0]._id.should.equal('_design/medic-client');
      docs[0]._rev.should.equal('2');
      docs[0].app_settings.setup_complete.should.equal(true);
      docs[1]._id.should.equal('appcache');
      docs[1]._rev.should.equal('5');
      docs[1].digest.should.equal('md5-JRYByZdYixaFg3a4L6X0pw==');
      done();
    });
  });

});
