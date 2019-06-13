const sinon = require('sinon');
const chai = require('chai');
const db = require('../../../src/db');
const migration = require('../../../src/migrations/convert-translation-messages-fix');

describe('convert-translation-messages migration', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('should work with no translation docs', () => {
    sinon.stub(db.medic, 'query').resolves({ rows: [] });
    return migration.run().then(() => {
      chai.expect(db.medic.query.callCount).to.equal(1);
      chai.expect(db.medic.query.args[0]).to.deep.equal([
        'medic-client/doc_by_type',
        {
          startkey: [ 'translations', false ],
          endkey: [ 'translations', true ],
          include_docs: true
        }
      ]);
    });
  });

  it('should update old version of translations', () => {
    const docs = [
      {
        _id: 'messages-en',
        type: 'translations',
        code: 'en',
        enabled: 'true',
        values: {
          one: '1',
          two: '2',
          three: '3'
        }
      },
      {
        _id: 'messages-fr',
        type: 'translations',
        code: 'fr',
        enabled: 'true',
        values: {
          one: 'un',
          two: 'deux',
          three: 'trois'
        }
      },
      {
        _id: 'messages-de',
        type: 'translations',
        code: 'de',
        enabled: 'true',
        values: {
          one: 'Eins',
          two: 'Zwei',
          three: 'Drei'
        }
      }
    ];

    sinon.stub(db.medic, 'query').resolves({ rows: docs.map(doc => ({ doc })) });
    sinon.stub(db.medic, 'getAttachment');
    db.medic.getAttachment
      .withArgs('_design/medic', 'translations/messages-en.properties').resolves('one=one\ntwo=two\n')
      .withArgs('_design/medic', 'translations/messages-fr.properties').resolves('one=1\n')
      .withArgs('_design/medic', 'translations/messages-de.properties').rejects({ status: 404 });
    sinon.stub(db.medic, 'put').resolves();

    return migration.run().then(() => {
      chai.expect(db.medic.query.callCount).to.equal(1);
      chai.expect(db.medic.getAttachment.callCount).to.equal(3);
      chai.expect(db.medic.put.callCount).to.equal(3);
      const messagesEn = db.medic.put.args.find(args => args[0]._id === 'messages-en');
      chai.expect(messagesEn).to.deep.equal([{
        _id: 'messages-en',
        type: 'translations',
        code: 'en',
        enabled: 'true',
        generic: {
          one: '1',
          two: '2'
        },
        custom: {
          three: '3'
        }
      }]);

      const messagesfr = db.medic.put.args.find(args => args[0]._id === 'messages-fr');
      chai.expect(messagesfr).to.deep.equal([{
        _id: 'messages-fr',
        type: 'translations',
        code: 'fr',
        enabled: 'true',
        generic: {
          one: 'un'
        },
        custom: {
          two: 'deux',
          three: 'trois'
        }
      }]);

      const messagesDe = db.medic.put.args.find(args => args[0]._id === 'messages-de');
      chai.expect(messagesDe).to.deep.equal([{
        _id: 'messages-de',
        type: 'translations',
        code: 'de',
        enabled: 'true',
        generic: {},
        custom: {
          one: 'Eins',
          two: 'Zwei',
          three: 'Drei'
        }
      }]);
    });
  });

  it('should skip already correct versions of translations', () => {
    const docs = [
      {
        _id: 'messages-en',
        type: 'translations',
        code: 'en',
        enabled: 'true',
        generic: {
          one: '1',
          two: '2',
          three: '3'
        },
      },
      {
        _id: 'messages-de',
        type: 'translations',
        code: 'de',
        enabled: 'true',
        generic: {},
        custom: {
          one: 'Eins',
          two: 'Zwei',
          three: 'Drei'
        }
      }
    ];

    sinon.stub(db.medic, 'query').resolves({ rows: docs.map(doc => ({ doc })) });
    sinon.stub(db.medic, 'getAttachment');
    sinon.stub(db.medic, 'put');

    return migration.run().then(() => {
      chai.expect(db.medic.query.callCount).to.equal(1);
      chai.expect(db.medic.getAttachment.callCount).to.equal(0);
      chai.expect(db.medic.put.callCount).to.equal(0);
    });
  });

  it('should correct mixed or incorrectly migrated translations', () => {
    const docs = [
      {
        _id: 'messages-en',
        type: 'translations',
        code: 'en',
        enabled: 'true',
        generic: {
          one: '1',
          two: '2',
        },
        values: {
          three: '3',
          four: '4'
        }
      },
      {
        _id: 'messages-fr',
        type: 'translations',
        code: 'fr',
        enabled: 'true',
        generic: {
          one: 'une',
          two: 'deux'
        },
        custom: {
          three: 'trois'
        },
        values: {
          two: 'deux',
          three: 'trois',
          four: 'quatre'
        }
      },
      {
        _id: 'messages-de',
        type: 'translations',
        code: 'de',
        enabled: 'true',
        generic: {},
        custom: {
          one: 'Eins',
          two: 'Zwei over',
          three: 'Drei over'
        },
        values: {
          two: 'Zwei',
          three: 'Drei',
          four: 'Vier'
        }
      }
    ];

    sinon.stub(db.medic, 'query').resolves({ rows: docs.map(doc => ({ doc })) });
    sinon.stub(db.medic, 'getAttachment');
    db.medic.getAttachment
      .withArgs('_design/medic', 'translations/messages-en.properties').resolves('one=one\ntwo=two\n')
      .withArgs('_design/medic', 'translations/messages-fr.properties').resolves('one=1\ntwo=2\n')
      .withArgs('_design/medic', 'translations/messages-de.properties').rejects({ status: 404 });
    sinon.stub(db.medic, 'put').resolves();

    return migration.run().then(() => {
      chai.expect(db.medic.query.callCount).to.equal(1);
      chai.expect(db.medic.getAttachment.callCount).to.equal(3);
      chai.expect(db.medic.put.callCount).to.equal(3);
      const messagesEn = db.medic.put.args.find(args => args[0]._id === 'messages-en');
      chai.expect(messagesEn).to.deep.equal([{
        _id: 'messages-en',
        type: 'translations',
        code: 'en',
        enabled: 'true',
        generic: {
          one: '1',
          two: '2'
        },
        custom: {
          three: '3',
          four: '4'
        }
      }]);

      const messagesfr = db.medic.put.args.find(args => args[0]._id === 'messages-fr');
      chai.expect(messagesfr).to.deep.equal([{
        _id: 'messages-fr',
        type: 'translations',
        code: 'fr',
        enabled: 'true',
        generic: {
          one: 'une',
          two: 'deux',
        },
        custom: {
          three: 'trois',
          four: 'quatre'
        }
      }]);

      const messagesDe = db.medic.put.args.find(args => args[0]._id === 'messages-de');
      chai.expect(messagesDe).to.deep.equal([{
        _id: 'messages-de',
        type: 'translations',
        code: 'de',
        enabled: 'true',
        generic: {},
        custom: {
          one: 'Eins',
          two: 'Zwei',
          three: 'Drei',
          four: 'Vier'
        }
      }]);
    });
  });

  it('should fail when saving fails', () => {
    const docs = [
      {
        _id: 'messages-en',
        type: 'translations',
        code: 'en',
        enabled: 'true',
        generic: {
          one: '1',
          two: '2',
        },
        values: {
          three: '3',
          four: '4'
        }
      }
    ];

    sinon.stub(db.medic, 'query').resolves({ rows: docs.map(doc => ({ doc })) });
    sinon.stub(db.medic, 'getAttachment').resolves('one=one\ntwo=two\n');
    sinon.stub(db.medic, 'put').rejects({ oh: 'nooo' });

    return migration
      .run()
      .then(() => chai.expect(false).to.equal('should have thrown'))
      .catch(err => {
        chai.expect(err).to.deep.equal({ oh: 'nooo' });
        chai.expect(db.medic.query.callCount).to.equal(1);
        chai.expect(db.medic.getAttachment.callCount).to.equal(1);
        chai.expect(db.medic.put.callCount).to.equal(1);
      });
  });
});
