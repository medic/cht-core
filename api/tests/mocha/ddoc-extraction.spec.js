const ddocExtraction = require('../../src/ddoc-extraction');
const sinon = require('sinon');
const db = require('../../src/db');
const chai = require('chai');
const environment = require('../../src/environment');

require('chai').should();

describe('DDoc extraction', () => {
  beforeEach(() => {
    sinon.stub(environment, 'setDeployInfo');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('finds all attached ddocs and, if required, updates them', () => {
    const get = sinon.stub(db.medic, 'get');
    const getAttachment = sinon.stub(db.medic, 'getAttachment');

    const attachment = { docs: [
      { _id: '_design/new', views: { doc_by_place: { map: 'function() { return true; }' } } },
      { _id: '_design/updated', views: { doc_by_valid: { map: 'function() { return true; }' } } },
      { _id: '_design/unchanged', views: { doc_by_valid: { map: 'function() { return true; }' } } },
    ] };
    const ddoc = {
      _id: '_design/medic',
      _attachments: {
        'js/service-worker.js': {
          revpos: 2730,
          digest: 'md5-JRYByZdYixaFg3a4L6X0pw==',
          length: 1224,
          stub: true
        }
      }
    };

    const getDdoc = get.withArgs('_design/medic').resolves(ddoc);
    const getDdocAttachment = getAttachment
      .withArgs('_design/medic', 'ddocs/compiled.json')
      .resolves(Buffer.from(JSON.stringify(attachment)));
    const getNew = get.withArgs('_design/new').rejects({ status: 404 });
    const getUpdated = get.withArgs('_design/updated').resolves({
      _id: '_design/updated', _rev: '1', views: { doc_by_valed: { map: 'function() { return true; }' } }
    });
    const getUnchanged = get.withArgs('_design/unchanged').resolves({
      _id: '_design/unchanged', _rev: '1', views: { doc_by_valid: { map: 'function() { return true; }' } }
    });
    const getSwMeta = get.withArgs('service-worker-meta').resolves({ digest: 'md5-JRYByZdYixaFg3a4L6X0pw==' });
    const getSettings = get.withArgs('settings').resolves({ });
    const bulk = sinon.stub(db.medic, 'bulkDocs').resolves();

    return ddocExtraction.run().then(() => {
      getDdoc.callCount.should.equal(1);
      getDdocAttachment.callCount.should.equal(1);
      getNew.callCount.should.equal(1);
      getUpdated.callCount.should.equal(1);
      getUnchanged.callCount.should.equal(1);
      getSwMeta.callCount.should.equal(1);
      getSettings.callCount.should.equal(0);
      bulk.callCount.should.equal(1);
      const docs = bulk.args[0][0].docs;
      docs.length.should.equal(2);
      docs[0]._id.should.equal('_design/new');
      chai.expect(docs[0]._rev).to.equal(undefined);
      docs[1]._id.should.equal('_design/updated');
      docs[1]._rev.should.equal('1');
    });
  });

  it('checks attachment data', () => {
    const get = sinon.stub(db.medic, 'get');
    const getAttachment = sinon.stub(db.medic, 'getAttachment');

    const unchangedData1 = 'some data';
    const unchangedData2 = 'some more data';
    const changedData1 = 'some further data';
    const changedData2 = 'the last of the data';

    const attachment = { docs: [
      {
        _id: '_design/updated',
        _attachments: {
          'css/main.css': {
            'content_type': 'text/css',
            'data': changedData1
          },
          'js/main.js': {
            'content_type': 'application/javascript',
            'data': changedData2
          }
        }
      },
      {
        _id: '_design/unchanged',
        _attachments: {
          'css/main.css': {
            'content_type': 'text/css',
            'data': unchangedData1
          },
          'js/main.js': {
            'content_type': 'application/javascript',
            'data': unchangedData2
          }
        }
      },
    ] };
    const ddoc = {
      _id: '_design/medic',
      _attachments: {
        'js/service-worker.js': {
          revpos: 2730,
          digest: 'md5-JRYByZdYixaFg3a4L6X0pw==',
          length: 1224,
          stub: true
        }
      }
    };

    const getDdoc = get.withArgs('_design/medic').resolves(ddoc);
    const getDdocAttachment = getAttachment
      .withArgs('_design/medic', 'ddocs/compiled.json')
      .resolves(Buffer.from(JSON.stringify(attachment)));
    const getUpdated = get.withArgs('_design/updated').resolves({
      _id: '_design/updated',
      _rev: '1',
      _attachments: {
        'css/main.css': {
          'content_type': 'text/css',
          'revpos': 442,
          'digest': 'md5-GuGMKFfYIWFhkG0apv8qYg==',
          'length': 201807,
          'data': changedData1
        },
        'js/main.js': {
          'content_type': 'application/javascript',
          'revpos': 442,
          'digest': 'md5-fuGMKFfYIWFhkG0apv8qYg==',
          'length': 12688851,
          'data': 'SOMETHING NEW'
        }
      }
    });
    const getUnchanged = get.withArgs('_design/unchanged').resolves({
      _id: '_design/unchanged',
      _rev: '1',
      _attachments: {
        'css/main.css': {
          'content_type': 'text/css',
          'revpos': 442,
          'digest': 'md5-auGMKFfYIWFhkG0apv8qYg==',
          'length': 201807,
          'data': unchangedData1
        },
        'js/main.js': {
          'content_type': 'application/javascript',
          'revpos': 442,
          'digest': 'md5-buGMKFfYIWFhkG0apv8qYg==',
          'length': 12688851,
          'data': unchangedData2
        }
      }
    });
    const getSwMeta = get.withArgs('service-worker-meta').resolves({ digest: 'md5-JRYByZdYixaFg3a4L6X0pw==' });
    const getSettings = get.withArgs('settings').resolves({ });
    const bulk = sinon.stub(db.medic, 'bulkDocs').resolves();

    return ddocExtraction.run().then(() => {
      getDdoc.callCount.should.equal(1);
      getDdocAttachment.callCount.should.equal(1);
      getUpdated.callCount.should.equal(1);
      getUnchanged.callCount.should.equal(1);
      getSwMeta.callCount.should.equal(1);
      getSettings.callCount.should.equal(0);
      bulk.callCount.should.equal(1);
      const docs = bulk.args[0][0].docs;
      docs.length.should.equal(1);
      docs[0]._id.should.equal('_design/updated');
      docs[0]._rev.should.equal('1');
    });
  });

  it('works when the compiled ddocs is not found', () => {
    const ddoc = {
      _id: '_design/medic',
      _attachments: {
        'js/service-worker.js': {
          revpos: 2730,
          digest: 'md5-JRYByZdYixaFg3a4L6X0pw==',
          length: 1224,
          stub: true
        }
      }
    };
    const get = sinon.stub(db.medic, 'get');
    const getAttachment = sinon.stub(db.medic, 'getAttachment');
    const getDdoc = get.withArgs('_design/medic').resolves(ddoc);
    const getDdocAttachment = getAttachment
      .withArgs('_design/medic', 'ddocs/compiled.json')
      .rejects({ status: 404 });
    const getSwMeta = get.withArgs('service-worker-meta').resolves({ digest: 'md5-JRYByZdYixaFg3a4L6X0pw==' });
    const getSettings = get.withArgs('settings').resolves({ });
    return ddocExtraction.run().then(() => {
      getDdoc.callCount.should.equal(1);
      getDdocAttachment.callCount.should.equal(1);
      getSwMeta.callCount.should.equal(1);
      getSettings.callCount.should.equal(0);
    });
  });

  it('updates appcache doc when not found', () => {
    const get = sinon.stub(db.medic, 'get');
    const getAttachment = sinon.stub(db.medic, 'getAttachment');

    const attachment = { docs: [
      { _id: '_design/medic-client', views: { doc_by_valid: { map: 'function() { return true; }' } } }
    ] };
    const ddoc = {
      _id: '_design/medic',
      deploy_info: 1,
      _attachments: {
        'js/service-worker.js': {
          revpos: 2730,
          digest: 'md5-JRYByZdYixaFg3a4L6X0pw==',
          length: 1224,
          stub: true
        }
      }
    };
    const existingClient = {
      _id: '_design/medic-client',
      deploy_info: 1,
      _rev: '2',
      views: { doc_by_valid: { map: 'function() { return true; }' } }
    };

    const getDdoc = get.withArgs('_design/medic').resolves(ddoc);
    const getDdocAttachment = getAttachment
      .withArgs('_design/medic', 'ddocs/compiled.json')
      .resolves(Buffer.from(JSON.stringify(attachment)));
    const getSwMeta = get.withArgs('service-worker-meta').rejects({ status: 404 });
    const getSettings = get.withArgs('settings').resolves({ });
    const getClient = get.withArgs('_design/medic-client').resolves(existingClient);
    const bulk = sinon.stub(db.medic, 'bulkDocs').resolves();

    return ddocExtraction.run().then(() => {
      getDdoc.callCount.should.equal(1);
      getDdocAttachment.callCount.should.equal(1);
      getSwMeta.callCount.should.equal(1);
      getSettings.callCount.should.equal(0);
      getClient.callCount.should.equal(1);
      bulk.callCount.should.equal(1);
      const docs = bulk.args[0][0].docs;
      chai.expect(docs.length).to.equal(1);
      docs[0]._id.should.equal('service-worker-meta');
      chai.expect(docs[0]._rev).to.equal(undefined);
      docs[0].digest.should.equal('md5-JRYByZdYixaFg3a4L6X0pw==');
    });
  });

  it('updates appcache doc when out of date', () => {
    const get = sinon.stub(db.medic, 'get');
    const getAttachment = sinon.stub(db.medic, 'getAttachment');

    const attachment = { docs: [
      { _id: '_design/medic-client', views: { doc_by_valid: { map: 'function() { return true; }' } } }
    ] };
    const ddoc = {
      _id: '_design/medic',
      deploy_info: 1,
      _attachments: {
        'js/service-worker.js': {
          revpos: 2730,
          digest: 'md5-JRYByZdYixaFg3a4L6X0pw==',
          length: 1224,
          stub: true
        }
      }
    };
    const existingClient = {
      _id: '_design/medic-client',
      _rev: '2',
      deploy_info: 1,
      views: { doc_by_valid: { map: 'function() { return true; }' } }
    };
    const appcache = {
      _id: 'appcache',
      _rev: '5',
      digest: 'md5-different=='
    };

    const getDdoc = get.withArgs('_design/medic').resolves(ddoc);
    const getDdocAttachment = getAttachment
      .withArgs('_design/medic', 'ddocs/compiled.json')
      .resolves(Buffer.from(JSON.stringify(attachment)));
    const getSwMeta = get.withArgs('service-worker-meta').resolves(appcache);
    const getSettings = get.withArgs('settings').resolves({ });
    const getClient = get.withArgs('_design/medic-client').resolves(existingClient);
    const bulk = sinon.stub(db.medic, 'bulkDocs').resolves();

    return ddocExtraction.run().then(() => {
      getDdoc.callCount.should.equal(1);
      getDdocAttachment.callCount.should.equal(1);
      getSwMeta.callCount.should.equal(1);
      getSettings.callCount.should.equal(0);
      getClient.callCount.should.equal(1);
      bulk.callCount.should.equal(1);
      const docs = bulk.args[0][0].docs;
      chai.expect(docs.length).to.equal(1);
      docs[0]._id.should.equal('appcache');
      docs[0]._rev.should.equal('5');
      docs[0].digest.should.equal('md5-JRYByZdYixaFg3a4L6X0pw==');
    });
  });

  it('copies deploy_info into medic-client', () => {
    const get = sinon.stub(db.medic, 'get');
    const getAttachment = sinon.stub(db.medic, 'getAttachment');

    const attachment = { docs: [
      { _id: '_design/medic-client', views: { doc_by_valid: { map: 'function() { return true; }' } } }
    ] };
    const ddoc = {
      _id: '_design/medic',
      deploy_info: { version: 2 },
      _attachments: {
        'js/service-worker.js': {
          revpos: 2730,
          digest: 'md5-JRYByZdYixaFg3a4L6X0pw==',
          length: 1224,
          stub: true
        }
      }
    };
    const existingClient = {
      _id: '_design/medic-client',
      _rev: '2',
      views: { doc_by_valid: { map: 'function() { return true; }' } }
    };
    const appcache = {
      _id: 'appcache',
      _rev: '5',
      digest: 'md5-JRYByZdYixaFg3a4L6X0pw=='
    };

    const getDdoc = get.withArgs('_design/medic').resolves(ddoc);
    const getDdocAttachment = getAttachment
      .withArgs('_design/medic', 'ddocs/compiled.json')
      .resolves(Buffer.from(JSON.stringify(attachment)));
    const getSwMeta = get.withArgs('service-worker-meta').resolves(appcache);
    const getSettings = get.withArgs('settings').resolves({ });
    const getClient = get.withArgs('_design/medic-client').resolves(existingClient);
    const bulk = sinon.stub(db.medic, 'bulkDocs').resolves();

    return ddocExtraction.run().then(() => {
      getDdoc.callCount.should.equal(1);
      getDdocAttachment.callCount.should.equal(1);
      getSwMeta.callCount.should.equal(1);
      getSettings.callCount.should.equal(0);
      getClient.callCount.should.equal(1);
      bulk.callCount.should.equal(1);
      const docs = bulk.args[0][0].docs;
      chai.expect(docs.length).to.equal(1);
      docs[0]._id.should.equal('_design/medic-client');
      docs[0]._rev.should.equal('2');
      docs[0].deploy_info.should.deep.equal({ version: 2 });
      environment.setDeployInfo.callCount.should.equal(1);
      environment.setDeployInfo.args[0].should.deep.equal([{ version: 2 }]);
    });
  });

  it('overwrites deploy_info from medic-client', () => {
    const get = sinon.stub(db.medic, 'get');
    const getAttachment = sinon.stub(db.medic, 'getAttachment');

    const attachment = { docs: [
      { _id: '_design/medic-client', views: { doc_by_valid: { map: 'function() { return true; }' } } }
    ] };
    const ddoc = {
      _id: '_design/medic',
      deploy_info: { version: 2 },
      _attachments: {
        'js/service-worker.js': {
          revpos: 2730,
          digest: 'md5-JRYByZdYixaFg3a4L6X0pw==',
          length: 1224,
          stub: true
        }
      }
    };
    const existingClient = {
      _id: '_design/medic-client',
      _rev: '2',
      deploy_info: { version: 1 },
      views: { doc_by_valid: { map: 'function() { return true; }' } }
    };
    const appcache = {
      _id: 'appcache',
      _rev: '5',
      digest: 'md5-JRYByZdYixaFg3a4L6X0pw=='
    };

    const getDdoc = get.withArgs('_design/medic').resolves(ddoc);
    const getDdocAttachment = getAttachment
      .withArgs('_design/medic', 'ddocs/compiled.json')
      .resolves(Buffer.from(JSON.stringify(attachment)));
    const getSwMeta = get.withArgs('service-worker-meta').resolves(appcache);
    const getSettings = get.withArgs('settings').resolves({ });
    const getClient = get.withArgs('_design/medic-client').resolves(existingClient);
    const bulk = sinon.stub(db.medic, 'bulkDocs').resolves();

    return ddocExtraction.run().then(() => {
      getDdoc.callCount.should.equal(1);
      getDdocAttachment.callCount.should.equal(1);
      getSwMeta.callCount.should.equal(1);
      getSettings.callCount.should.equal(0);
      getClient.callCount.should.equal(1);
      bulk.callCount.should.equal(1);
      const docs = bulk.args[0][0].docs;
      chai.expect(docs.length).to.equal(1);
      docs[0]._id.should.equal('_design/medic-client');
      docs[0]._rev.should.equal('2');
      docs[0].deploy_info.should.deep.equal({ version: 2 });
      environment.setDeployInfo.callCount.should.equal(1);
      environment.setDeployInfo.args[0].should.deep.equal([{ version: 2 }]);
    });
  });

  it('does not write client if no difference', () => {
    const get = sinon.stub(db.medic, 'get');
    const getAttachment = sinon.stub(db.medic, 'getAttachment');

    const attachment = { docs: [
      { _id: '_design/medic-client', views: { doc_by_valid: { map: 'function() { return true; }' } } }
    ] };
    const ddoc = {
      _id: '_design/medic',
      deploy_info: { version: 2 },
      _attachments: {
        'js/service-worker.js': {
          revpos: 2730,
          digest: 'md5-JRYByZdYixaFg3a4L6X0pw==',
          length: 1224,
          stub: true
        }
      }
    };
    const existingClient = {
      _id: '_design/medic-client',
      _rev: '2',
      deploy_info: { version: 2 },
      views: { doc_by_valid: { map: 'function() { return true; }' } }
    };
    const appcache = {
      _id: 'appcache',
      _rev: '5',
      digest: 'md5-JRYByZdYixaFg3a4L6X0pw=='
    };

    const getDdoc = get.withArgs('_design/medic').resolves(ddoc);
    const getDdocAttachment = getAttachment
      .withArgs('_design/medic', 'ddocs/compiled.json')
      .resolves(Buffer.from(JSON.stringify(attachment)));
    const getSwMeta = get.withArgs('service-worker-meta').resolves(appcache);
    const getSettings = get.withArgs('settings').resolves({ });
    const getClient = get.withArgs('_design/medic-client').resolves(existingClient);
    const bulk = sinon.stub(db.medic, 'bulkDocs').resolves();

    return ddocExtraction.run().then(() => {
      getDdoc.callCount.should.equal(1);
      getDdocAttachment.callCount.should.equal(1);
      getSwMeta.callCount.should.equal(1);
      getSettings.callCount.should.equal(0);
      getClient.callCount.should.equal(1);
      bulk.callCount.should.equal(0);
    });
  });

  it('does not update if no changes and deploy_info old and new value are falsy #5109', () => {
    const get = sinon.stub(db.medic, 'get');
    const getAttachment = sinon.stub(db.medic, 'getAttachment');

    const attachment = { docs: [
      { _id: '_design/medic-client', views: { doc_by_valid: { map: 'function() { return true; }' } } }
    ] };
    const ddoc = {
      _id: '_design/medic',
      _attachments: {
        'js/service-worker.js': {
          revpos: 2730,
          digest: 'md5-JRYByZdYixaFg3a4L6X0pw==',
          length: 1224,
          stub: true
        }
      }
    };
    const existingClient = {
      _id: '_design/medic-client',
      _rev: '2',
      views: { doc_by_valid: { map: 'function() { return true; }' } }
    };
    const appcache = {
      _id: 'appcache',
      _rev: '5',
      digest: 'md5-JRYByZdYixaFg3a4L6X0pw=='
    };

    const getDdoc = get.withArgs('_design/medic').resolves(ddoc);
    const getDdocAttachment = getAttachment
      .withArgs('_design/medic', 'ddocs/compiled.json')
      .resolves(Buffer.from(JSON.stringify(attachment)));
    const getSwMeta = get.withArgs('service-worker-meta').resolves(appcache);
    const getSettings = get.withArgs('settings').resolves({ });
    const getClient = get.withArgs('_design/medic-client').resolves(existingClient);
    const bulk = sinon.stub(db.medic, 'bulkDocs').resolves();

    return ddocExtraction.run().then(() => {
      getDdoc.callCount.should.equal(1);
      getDdocAttachment.callCount.should.equal(1);
      getSwMeta.callCount.should.equal(1);
      getSettings.callCount.should.equal(0);
      getClient.callCount.should.equal(1);
      bulk.callCount.should.equal(0);
    });
  });

  it('does update if no changes and new deploy_info #5109', () => {
    const get = sinon.stub(db.medic, 'get');
    const getAttachment = sinon.stub(db.medic, 'getAttachment');

    const attachment = { docs: [
      { _id: '_design/medic-client', views: { doc_by_valid: { map: 'function() { return true; }' } } }
    ] };
    const ddoc = {
      _id: '_design/medic',
      deploy_info: 'something',
      _attachments: {
        'js/service-worker.js': {
          revpos: 2730,
          digest: 'md5-JRYByZdYixaFg3a4L6X0pw==',
          length: 1224,
          stub: true
        }
      }
    };
    const existingClient = {
      _id: '_design/medic-client',
      _rev: '2',
      views: { doc_by_valid: { map: 'function() { return true; }' } }
    };
    const appcache = {
      _id: 'appcache',
      _rev: '5',
      digest: 'md5-JRYByZdYixaFg3a4L6X0pw=='
    };

    const getDdoc = get.withArgs('_design/medic').resolves(ddoc);
    const getDdocAttachment = getAttachment
      .withArgs('_design/medic', 'ddocs/compiled.json')
      .resolves(Buffer.from(JSON.stringify(attachment)));
    const getSwMeta = get.withArgs('service-worker-meta').resolves(appcache);
    const getSettings = get.withArgs('settings').resolves({ });
    const getClient = get.withArgs('_design/medic-client').resolves(existingClient);
    const bulk = sinon.stub(db.medic, 'bulkDocs').resolves();

    return ddocExtraction.run().then(() => {
      getDdoc.callCount.should.equal(1);
      getDdocAttachment.callCount.should.equal(1);
      getSwMeta.callCount.should.equal(1);
      getSettings.callCount.should.equal(0);
      getClient.callCount.should.equal(1);
      bulk.callCount.should.equal(1);
      const docs = bulk.args[0][0].docs;
      chai.expect(docs.length).to.equal(1);
      docs[0]._id.should.equal('_design/medic-client');
      docs[0]._rev.should.equal('2');
      chai.expect(docs[0].deploy_info).to.equal('something');
    });
  });

  it('does update if no changes and old deploy_info #5109', () => {
    const get = sinon.stub(db.medic, 'get');
    const getAttachment = sinon.stub(db.medic, 'getAttachment');

    const attachment = { docs: [
      { _id: '_design/medic-client', views: { doc_by_valid: { map: 'function() { return true; }' } } }
    ] };
    const ddoc = {
      _id: '_design/medic',
      _attachments: {
        'js/service-worker.js': {
          revpos: 2730,
          digest: 'md5-JRYByZdYixaFg3a4L6X0pw==',
          length: 1224,
          stub: true
        }
      }
    };
    const existingClient = {
      _id: '_design/medic-client',
      deploy_info: 'something',
      _rev: '2',
      views: { doc_by_valid: { map: 'function() { return true; }' } }
    };
    const appcache = {
      _id: 'appcache',
      _rev: '5',
      digest: 'md5-JRYByZdYixaFg3a4L6X0pw=='
    };

    const getDdoc = get.withArgs('_design/medic').resolves(ddoc);
    const getDdocAttachment = getAttachment
      .withArgs('_design/medic', 'ddocs/compiled.json')
      .resolves(Buffer.from(JSON.stringify(attachment)));
    const getSwMeta = get.withArgs('service-worker-meta').resolves(appcache);
    const getSettings = get.withArgs('settings').resolves({ });
    const getClient = get.withArgs('_design/medic-client').resolves(existingClient);
    const bulk = sinon.stub(db.medic, 'bulkDocs').resolves();

    return ddocExtraction.run().then(() => {
      getDdoc.callCount.should.equal(1);
      getDdocAttachment.callCount.should.equal(1);
      getSwMeta.callCount.should.equal(1);
      getSettings.callCount.should.equal(0);
      getClient.callCount.should.equal(1);
      bulk.callCount.should.equal(1);
      const docs = bulk.args[0][0].docs;
      chai.expect(docs.length).to.equal(1);
      docs[0]._id.should.equal('_design/medic-client');
      docs[0]._rev.should.equal('2');
      chai.expect(docs[0].deploy_info).to.equal(undefined);
    });
  });

  it('should set deploy_info even if oldDdoc does not exist', () => {
    const get = sinon.stub(db.medic, 'get');
    const getAttachment = sinon.stub(db.medic, 'getAttachment');

    const attachment = { docs: [
      { _id: '_design/medic-client', views: { doc_by_valid: { map: 'function() { return true; }' } } }
    ] };
    const ddoc = {
      _id: '_design/medic',
      deploy_info: 'something',
      _attachments: {
        'js/service-worker.js': {
          revpos: 2730,
          digest: 'md5-JRYByZdYixaFg3a4L6X0pw==',
          length: 1224,
          stub: true
        }
      }
    };
    const appcache = {
      _id: 'appcache',
      _rev: '5',
      digest: 'md5-JRYByZdYixaFg3a4L6X0pw=='
    };

    const getDdoc = get.withArgs('_design/medic').resolves(ddoc);
    const getDdocAttachment = getAttachment
      .withArgs('_design/medic', 'ddocs/compiled.json')
      .resolves(Buffer.from(JSON.stringify(attachment)));
    const getSwMeta = get.withArgs('service-worker-meta').resolves(appcache);
    const getSettings = get.withArgs('settings').resolves({ });
    const getClient = get.withArgs('_design/medic-client').rejects({ status: 404 });
    const bulk = sinon.stub(db.medic, 'bulkDocs').resolves();

    return ddocExtraction.run().then(() => {
      getDdoc.callCount.should.equal(1);
      getDdocAttachment.callCount.should.equal(1);
      getSwMeta.callCount.should.equal(1);
      getSettings.callCount.should.equal(0);
      getClient.callCount.should.equal(1);
      bulk.callCount.should.equal(1);
      const docs = bulk.args[0][0].docs;
      chai.expect(docs.length).to.equal(1);
      docs[0]._id.should.equal('_design/medic-client');
      chai.expect(docs[0]._rev).to.equal(undefined);
      chai.expect(docs[0].deploy_info).to.equal('something');
    });
  });

});
