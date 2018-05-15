const chai = require('chai'),
      sinon = require('sinon').sandbox.create(),
      properties = require('properties'),
      db = require('../../src/db-nano'),
      translations = require('../../src/translations');

describe('translations', () => {

  afterEach(() => {
    sinon.restore();
  });

  it('run returns errors from get ddoc', done => {
    const dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, 'boom');
    translations.run(err => {
      chai.expect(err).to.equal('boom');
      chai.expect(dbGet.args[0][0]).to.equal('_design/medic');
      done();
    });
  });

  it('run does nothing if no attachments', done => {
    const dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, {});
    const dbAttachment = sinon.stub(db.medic.attachment, 'get');
    translations.run(() => {
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(0);
      done();
    });
  });

  it('run does nothing if no translation attachments', done => {
    const ddoc = { _attachments: [ { 'logo.png': {} } ] };
    const dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
    const dbAttachment = sinon.stub(db.medic.attachment, 'get');
    translations.run(() => {
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(0);
      done();
    });
  });

  it('run returns errors from getting attachment', done => {
    const ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
    const dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
    const dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, 'boom');
    translations.run(err => {
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(dbAttachment.args[0][0]).to.equal('_design/medic');
      chai.expect(dbAttachment.args[0][1]).to.equal('translations/messages-en.properties');
      chai.expect(err).to.equal('boom');
      done();
    });
  });

  it('run returns errors from properties parse', done => {
    const ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
    const dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
    const dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
    const parse = sinon.stub(properties, 'parse').callsArgWith(1, 'boom');
    translations.run(err => {
      chai.expect(err).to.equal('boom');
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(parse.args[0][0]).to.equal('some buffer');
      done();
    });
  });

  it('run returns errors from getting backup files', done => {
    const ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
    const dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
    const dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
    const parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { first: '1st' });
    const dbView = sinon.stub(db.medic, 'view').callsArgWith(3, 'boom');
    translations.run(err => {
      chai.expect(err).to.equal('boom');
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(dbView.callCount).to.equal(1);
      chai.expect(dbView.args[0][0]).to.equal('medic-client');
      chai.expect(dbView.args[0][1]).to.equal('doc_by_type');
      chai.expect(dbView.args[0][2].key[0]).to.equal('translations-backup');
      chai.expect(dbView.args[0][2].include_docs).to.equal(true);
      done();
    });
  });

  it('run returns errors from getting translations files', done => {
    const ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
    const backups = [ { doc: { _id: 'messages-en-backup', values: { hello: 'Hello' } } } ];
    const dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
    const dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
    const parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { first: '1st' });
    const dbView = sinon.stub(db.medic, 'view');
    dbView.onCall(0).callsArgWith(3, null, { rows: backups });
    dbView.onCall(1).callsArgWith(3, 'boom');
    translations.run(err => {
      chai.expect(err).to.equal('boom');
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(dbView.callCount).to.equal(2);
      chai.expect(dbView.args[1][0]).to.equal('medic-client');
      chai.expect(dbView.args[1][1]).to.equal('doc_by_type');
      chai.expect(dbView.args[1][2].startkey[0]).to.equal('translations');
      chai.expect(dbView.args[1][2].startkey[1]).to.equal(false);
      chai.expect(dbView.args[1][2].endkey[0]).to.equal('translations');
      chai.expect(dbView.args[1][2].endkey[1]).to.equal(true);
      chai.expect(dbView.args[1][2].include_docs).to.equal(true);
      done();
    });
  });

  it('does nothing if translation unchanged', done => {
    const ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
    const backups = [ { doc: {
      _id: 'messages-en-backup',
      code: 'en',
      type: 'translations-backup',
      values: { hello: 'Hello' }
    } } ];
    const docs = [ { doc: {
      _id: 'messages-en',
      code: 'en',
      type: 'translations',
      values: { hello: 'Gidday' }
    } } ];
    const dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
    const dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
    const parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { hello: 'Hello' });
    const dbView = sinon.stub(db.medic, 'view');
    dbView.onCall(0).callsArgWith(3, null, { rows: backups });
    dbView.onCall(1).callsArgWith(3, null, { rows: docs });
    translations.run(err => {
      chai.expect(err).to.equal(undefined);
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(dbView.callCount).to.equal(2);
      done();
    });
  });

  it('returns errors from db bulk', done => {
    const ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
    const backups = [ { doc: {
      _id: 'messages-en-backup',
      code: 'en',
      type: 'translations-backup',
      values: { hello: 'Hello', bye: 'Goodbye' }
    } } ];
    const docs = [ { doc: {
      _id: 'messages-en',
      code: 'en',
      type: 'translations',
      values: { hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
    } } ];
    const dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
    const dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
    const parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { hello: 'Hello UPDATED', bye: 'Goodbye UPDATED', added: 'ADDED' });
    const dbView = sinon.stub(db.medic, 'view');
    dbView.onCall(0).callsArgWith(3, null, { rows: backups });
    dbView.onCall(1).callsArgWith(3, null, { rows: docs });
    const dbBulk = sinon.stub(db.medic, 'bulk').callsArgWith(1, 'boom');
    translations.run(err => {
      chai.expect(err).to.equal('boom');
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(dbView.callCount).to.equal(2);
      chai.expect(dbBulk.callCount).to.equal(1);
      done();
    });
  });

  it('merges updated translations where not modified by configuration', done => {
    const ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
    const backups = [ { doc: {
      _id: 'messages-en-backup',
      code: 'en',
      type: 'translations-backup',
      values: { hello: 'Hello', bye: 'Goodbye' }
    } } ];
    const docs = [ { doc: {
      _id: 'messages-en',
      code: 'en',
      type: 'translations',
      values: { hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
    } } ];
    const dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
    const dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
    const parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { hello: 'Hello UPDATED', bye: 'Goodbye UPDATED', added: 'ADDED' });
    const dbView = sinon.stub(db.medic, 'view');
    dbView.onCall(0).callsArgWith(3, null, { rows: backups });
    dbView.onCall(1).callsArgWith(3, null, { rows: docs });
    const dbBulk = sinon.stub(db.medic, 'bulk').callsArgWith(1);
    translations.run(err => {
      chai.expect(err).to.equal(undefined);
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(dbView.callCount).to.equal(2);
      chai.expect(dbBulk.callCount).to.equal(1);
      chai.expect(dbBulk.args[0][0]).to.deep.equal({ docs: [
        { // merged translations doc
          _id: 'messages-en',
          code: 'en',
          type: 'translations',
          values: {
            hello: 'Hello UPDATED',
            bye: 'Goodbye CUSTOMISED',
            added: 'ADDED'
          }
        },
        { // updated backup doc
          _id: 'messages-en-backup',
          code: 'en',
          type: 'translations-backup',
          values: {
            hello: 'Hello UPDATED',
            bye: 'Goodbye UPDATED',
            added: 'ADDED'
          }
        }
      ] });
      done();
    });
  });

  it('do not update if existing and attached translation is empty', done => {
    // this is a special case broken by checking falsey
    const ddoc = { _attachments: { 'translations/messages-en.properties': {} } };
    const backups = [ { doc: {
      _id: 'messages-en-backup',
      code: 'en',
      type: 'translations-backup',
      values: { empty: '' }
    } } ];
    const docs = [ { doc: {
      _id: 'messages-en',
      code: 'en',
      type: 'translations',
      values: { empty: '' }
    } } ];
    sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
    sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
    sinon.stub(properties, 'parse').callsArgWith(1, null, { empty: '' });
    const dbView = sinon.stub(db.medic, 'view');
    dbView.onCall(0).callsArgWith(3, null, { rows: backups });
    dbView.onCall(1).callsArgWith(3, null, { rows: docs });
    const dbBulk = sinon.stub(db.medic, 'bulk').callsArgWith(1);
    translations.run(err => {
      chai.expect(err).to.equal(undefined);
      chai.expect(dbBulk.callCount).to.equal(0);
      done();
    });
  });

  it('creates new language', done => {
    const ddoc = { _attachments: { 'translations/messages-fr.properties': {} } };
    const backups = [ { doc: {
      _id: 'messages-en-backup',
      code: 'en',
      type: 'translations-backup',
      values: { hello: 'Hello', bye: 'Goodbye' }
    } } ];
    const docs = [ { doc: {
      _id: 'messages-en',
      code: 'en',
      type: 'translations',
      values: { hello: 'Hello', bye: 'Goodbye CUSTOMISED' }
    } } ];
    const dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
    const dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
    const parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { hello: 'Hello UPDATED', bye: 'Goodbye UPDATED', added: 'ADDED' });
    const dbView = sinon.stub(db.medic, 'view');
    dbView.onCall(0).callsArgWith(3, null, { rows: backups });
    dbView.onCall(1).callsArgWith(3, null, { rows: docs });
    const dbBulk = sinon.stub(db.medic, 'bulk').callsArgWith(1);
    translations.run(err => {
      chai.expect(err).to.equal(undefined);
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(dbView.callCount).to.equal(2);
      chai.expect(dbBulk.callCount).to.equal(1);
      chai.expect(dbBulk.args[0][0]).to.deep.equal({ docs: [
        { // new
          _id: 'messages-fr',
          type: 'translations',
          code: 'fr',
          name: 'Français (French)',
          enabled: true,
          values: {
            hello: 'Hello UPDATED',
            bye: 'Goodbye UPDATED',
            added: 'ADDED'
          }
        },
        { // updated backup doc
          _id: 'messages-fr-backup',
          type: 'translations-backup',
          code: 'fr',
          values: {
            hello: 'Hello UPDATED',
            bye: 'Goodbye UPDATED',
            added: 'ADDED'
          }
        }
      ] });
      done();
    });
  });

  it('does not recreate deleted language', done => {
    const ddoc = { _attachments: {
      'translations/messages-fr.properties': {}
    } };
    const backups = [
      { doc: {
        _id: 'messages-en-backup',
        type: 'translations-backup',
        code: 'en',
        values: { hello: 'Hello', bye: 'Goodbye' }
      } },
      { doc: {
        _id: 'messages-fr-backup',
        type: 'translations-backup',
        code: 'fr',
        values: { hello: 'Hello', bye: 'Goodbye' }
      } }
    ];
    const docs = [ { doc: {
      _id: 'messages-en',
      type: 'translations',
      code: 'en',
      values: { hello: 'Hello', bye: 'Goodbye' }
    } } ];
    const dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
    const dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
    const parse = sinon.stub(properties, 'parse').callsArgWith(1, null, { hello: 'Hello UPDATED', bye: 'Goodbye UPDATED', added: 'ADDED' });
    const dbView = sinon.stub(db.medic, 'view');
    dbView.onCall(0).callsArgWith(3, null, { rows: backups });
    dbView.onCall(1).callsArgWith(3, null, { rows: docs });
    const dbBulk = sinon.stub(db.medic, 'bulk').callsArgWith(1);
    translations.run(err => {
      chai.expect(err).to.equal(undefined);
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(dbView.callCount).to.equal(2);
      chai.expect(dbBulk.callCount).to.equal(1);
      chai.expect(dbBulk.args[0][0]).to.deep.equal({ docs: [
        { // updated backup doc
          _id: 'messages-fr-backup',
          type: 'translations-backup',
          code: 'fr',
          values: {
            hello: 'Hello UPDATED',
            bye: 'Goodbye UPDATED',
            added: 'ADDED'
          }
        }
      ] });
      done();
    });
  });

  it('merges multiple translation files', done => {
    const ddoc = { _attachments: {
      'translations/messages-en.properties': {},
      'translations/messages-fr.properties': {}
    } };
    const backups = [
      { doc: {
        _id: 'messages-en-backup',
        code: 'en',
        type: 'translations-backup',
        values: { hello: 'Hello EN', bye: 'Goodbye EN' }
      } },
      { doc: {
        _id: 'messages-fr-backup',
        code: 'fr',
        type: 'translations-backup',
        values: { hello: 'Hello FR', bye: 'Goodbye FR' }
      } }
    ];
    const docs = [
      { doc: {
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        values: { hello: 'Hello EN', bye: 'Goodbye EN CUSTOMISED' }
      } },
      { doc: {
        _id: 'messages-fr',
        code: 'fr',
        type: 'translations',
        values: { hello: 'Hello FR', bye: 'Goodbye FR CUSTOMISED' }
      } }
    ];
    const dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
    const dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
    const parse = sinon.stub(properties, 'parse');
    parse.onCall(0).callsArgWith(1, null, { hello: 'Hello EN UPDATED', bye: 'Goodbye EN UPDATED', added: 'EN ADDED' });
    parse.onCall(1).callsArgWith(1, null, { hello: 'Hello FR UPDATED', bye: 'Goodbye FR UPDATED', added: 'FR ADDED' });
    const dbView = sinon.stub(db.medic, 'view');
    dbView.onCall(0).callsArgWith(3, null, { rows: backups });
    dbView.onCall(1).callsArgWith(3, null, { rows: docs });
    const dbBulk = sinon.stub(db.medic, 'bulk').callsArgWith(1);
    translations.run(err => {
      chai.expect(err).to.equal(undefined);
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(2);
      chai.expect(parse.callCount).to.equal(2);
      chai.expect(dbView.callCount).to.equal(2);
      chai.expect(dbBulk.callCount).to.equal(1);
      chai.expect(dbBulk.args[0][0]).to.deep.equal({ docs: [
        {
          _id: 'messages-en',
          code: 'en',
          type: 'translations',
          values: {
            hello: 'Hello EN UPDATED',
            bye: 'Goodbye EN CUSTOMISED',
            added: 'EN ADDED'
          }
        },
        {
          _id: 'messages-en-backup',
          code: 'en',
          type: 'translations-backup',
          values: {
            hello: 'Hello EN UPDATED',
            bye: 'Goodbye EN UPDATED',
            added: 'EN ADDED'
          }
        },
        {
          _id: 'messages-fr',
          code: 'fr',
          type: 'translations',
          values: {
            hello: 'Hello FR UPDATED',
            bye: 'Goodbye FR CUSTOMISED',
            added: 'FR ADDED'
          }
        },
        {
          _id: 'messages-fr-backup',
          code: 'fr',
          type: 'translations-backup',
          values: {
            hello: 'Hello FR UPDATED',
            bye: 'Goodbye FR UPDATED',
            added: 'FR ADDED'
          }
        }
      ] });
      done();
    });
  });

  it('defaults null translation values to the key - #3753', done => {
    const ddoc = { _attachments: {
      'translations/messages-en.properties': {}
    } };
    const backups = [
      { doc: {
        _id: 'messages-en-backup',
        code: 'en',
        type: 'translations-backup',
        values: { hello: null, bye: 'Goodbye' }
      } }
    ];
    const docs = [
      { doc: {
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        values: { hello: null, bye: 'Goodbye' }
      } }
    ];
    const dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
    const dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
    const parse = sinon.stub(properties, 'parse');
    parse.onCall(0).callsArgWith(1, null, { hello: null, bye: 'Goodbye' });
    const dbView = sinon.stub(db.medic, 'view');
    dbView.onCall(0).callsArgWith(3, null, { rows: backups });
    dbView.onCall(1).callsArgWith(3, null, { rows: docs });
    const dbBulk = sinon.stub(db.medic, 'bulk').callsArgWith(1);
    translations.run(err => {
      chai.expect(err).to.equal(undefined);
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(1);
      chai.expect(parse.callCount).to.equal(1);
      chai.expect(dbView.callCount).to.equal(2);
      chai.expect(dbBulk.callCount).to.equal(1);
      chai.expect(dbBulk.args[0][0]).to.deep.equal({ docs: [
        {
          _id: 'messages-en',
          code: 'en',
          type: 'translations',
          values: {
            hello: 'hello',
            bye: 'Goodbye'
          }
        },
        {
          _id: 'messages-en-backup',
          code: 'en',
          type: 'translations-backup',
          values: {
            hello: 'hello',
            bye: 'Goodbye'
          }
        }
      ] });
      done();
    });
  });

  it('defaults undefined translation values to the key - #3753', done => {
    const ddoc = { _attachments: {
      'translations/messages-en.properties': {},
      'translations/messages-ne.properties': {}
    } };
    const backups = [
      { doc: {
        _id: 'messages-en-backup',
        code: 'en',
        type: 'translations-backup',
        values: { hello: 'Hello', bye: 'Goodbye' }
      } },
      { doc: {
        _id: 'messages-ne-backup',
        code: 'ne',
        type: 'translations-backup',
        values: { bye: 'Goodbye' }
      } }
    ];
    const docs = [
      { doc: {
        _id: 'messages-en',
        code: 'en',
        type: 'translations',
        values: { hello: 'Hello', bye: 'Goodbye' }
      } },
      { doc: {
        _id: 'messages-ne',
        code: 'ne',
        type: 'translations',
        values: { bye: 'Goodbye' }
      } }
    ];
    const dbGet = sinon.stub(db.medic, 'get').callsArgWith(1, null, ddoc);
    const dbAttachment = sinon.stub(db.medic.attachment, 'get').callsArgWith(2, null, 'some buffer');
    const parse = sinon.stub(properties, 'parse');
    parse.onCall(0).callsArgWith(1, null, { hello: 'Hello', bye: 'Goodbye' });
    parse.onCall(1).callsArgWith(1, null, { bye: 'Goodbye' });
    const dbView = sinon.stub(db.medic, 'view');
    dbView.onCall(0).callsArgWith(3, null, { rows: backups });
    dbView.onCall(1).callsArgWith(3, null, { rows: docs });
    const dbBulk = sinon.stub(db.medic, 'bulk').callsArgWith(1);
    translations.run(err => {
      chai.expect(err).to.equal(undefined);
      chai.expect(dbGet.callCount).to.equal(1);
      chai.expect(dbAttachment.callCount).to.equal(2);
      chai.expect(parse.callCount).to.equal(2);
      chai.expect(dbView.callCount).to.equal(2);
      chai.expect(dbBulk.callCount).to.equal(1);
      chai.expect(dbBulk.args[0][0]).to.deep.equal({ docs: [
        {
          _id: 'messages-ne',
          code: 'ne',
          type: 'translations',
          values: {
            hello: 'hello', // defaults to the translation key
            bye: 'Goodbye'
          }
        },
        {
          _id: 'messages-ne-backup',
          code: 'ne',
          type: 'translations-backup',
          values: {
            hello: 'hello',
            bye: 'Goodbye'
          }
        }
      ] });
      done();
    });
  });

});
