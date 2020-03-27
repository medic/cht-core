describe('SendMessage service', () => {

  'use strict';

  let service;
  let Settings;
  let allDocs;
  let post;
  let query;
  let ServicesActions;
  let MarkRead;

  beforeEach(() => {
    allDocs = sinon.stub();
    post = sinon.stub();
    query = sinon.stub();
    Settings = sinon.stub();
    MarkRead = sinon.stub();
    ServicesActions = { setLastChangedDoc: sinon.stub() };

    post.resolves();
    Settings.resolves({});

    module('inboxApp');
    module($provide => {
      $provide.factory('DB', KarmaUtils.mockDB({ allDocs, post, query }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('UserSettings', () => {
        return Promise.resolve({ phone: '+5551', name: 'jack' });
      });
      $provide.value('Settings', Settings);
      $provide.value('MarkRead', MarkRead);
      $provide.value('ServicesActions', () => ServicesActions);
    });
    inject(_SendMessage_ => {
      service = _SendMessage_;
    });
  });

  afterEach(() => {
    KarmaUtils.restore(allDocs, post, query);
  });

  function assertMessage(task, expected) {
    chai.expect(task.state).to.equal('pending');
    chai.expect(task.messages.length).to.equal(1);
    const msg = task.messages[0];
    chai.expect(msg.from).to.equal(expected.from);
    chai.expect(msg.sent_by).to.equal(expected.sent_by);
    chai.expect(msg.to).to.equal(expected.to);
    chai.expect(msg.uuid).to.not.be.undefined; // jshint ignore:line
    chai.expect(msg.contact).to.deep.equal(expected.contact);
  }

  function mockAllDocs(docs) {
    if (!Array.isArray(docs)) {
      docs = [docs];
    }
    return Promise.resolve({
      rows: docs.map(doc => ({ doc }))
    });
  }

  function select2Wrap(docs) {
    if (!Array.isArray(docs)) {
      docs = [docs];
    }
    return docs.map(doc => ({ doc }));
  }

  it('create doc for one recipient', () => {

    const recipient = {
      _id: 'abc',
      contact: {
        phone: '+5552'
      }
    };

    allDocs.returns(mockAllDocs(recipient));

    return service(select2Wrap(recipient), 'hello').then(() => {
      chai.expect(allDocs.callCount).to.equal(1);
      chai.expect(post.callCount).to.equal(1);
      const savedDoc = post.args[0][0];
      assertMessage(savedDoc.tasks[0], {
        from: '+5551',
        sent_by: 'jack',
        to: '+5552',
        contact: { _id: recipient._id }
      });
      chai.expect(ServicesActions.setLastChangedDoc.callCount).to.equal(1);
      chai.expect(ServicesActions.setLastChangedDoc.args[0]).to.deep.equal([post.args[0][0]]);
      chai.expect(MarkRead.callCount).to.equal(1);
      const readDocs = MarkRead.args[0][0];
      chai.expect(readDocs.length).to.equal(1);
      chai.expect(readDocs[0]._id).to.equal(savedDoc._id);
    });
  });

  it('create doc for non-contact recipient from select2', () => {

    const recipient = {
      selected: false,
      disabled: false,
      text: '+5552',
      id: '+5552',
      _resultId: 'select2-phone-os-result-ef7y-+447890119334',
      element: {}
    };

    allDocs.returns(mockAllDocs(recipient));

    service(recipient, 'hello').then(() => {
      chai.expect(post.callCount).to.equal(1);
      assertMessage(post.args[0][0].tasks[0], {
        from: '+5551',
        sent_by: 'jack',
        to: '+5552'
      });
    });
  });

  it('normalizes phone numbers', () => {
    // Note : only valid phone numbers can be normalized.

    const phoneNumber = '700123456';
    const recipient = {
      _id: 'def',
      contact: {
        phone: phoneNumber
      }
    };
    allDocs.returns(mockAllDocs(recipient));
    Settings.resolves({ default_country_code: 254 });

    return service(select2Wrap(recipient), 'hello').then(() => {
      chai.expect(post.callCount).to.equal(1);
      assertMessage(post.args[0][0].tasks[0], {
        from: '+5551',
        sent_by: 'jack',
        to: '+254' + phoneNumber,
        contact: { _id: recipient._id }
      });
    });
  });

  it('create doc for multiple recipients', () => {

    const recipients = [
      {
        _id: 'abc',
        contact: {
          phone: '+5552'
        }
      },
      {
        _id: 'efg',
        contact: {
          phone: '+5553'
        }
      }
    ];

    allDocs.returns(mockAllDocs(recipients));

    return service(select2Wrap(recipients), 'hello').then(() => {
      chai.expect(post.callCount).to.equal(1);
      chai.expect(post.args[0][0].tasks.length).to.equal(2);
      assertMessage(post.args[0][0].tasks[0], {
        from: '+5551',
        sent_by: 'jack',
        to: '+5552',
        contact: { _id: recipients[0]._id }
      });
      assertMessage(post.args[0][0].tasks[1], {
        from: '+5551',
        sent_by: 'jack',
        to: '+5553',
        contact: { _id: recipients[1]._id }
      });
      chai.expect    (post.args[0][0].tasks[0].messages[0].uuid)
        .to.not.equal(post.args[0][0].tasks[1].messages[0].uuid);
      chai.expect(ServicesActions.setLastChangedDoc.callCount).to.equal(1);
      chai.expect(ServicesActions.setLastChangedDoc.args[0]).to.deep.equal([post.args[0][0]]);
    });
  });

  it('create doc for everyoneAt recipients', () => {

    const recipients = [
      {
        doc: {
          _id: 'abc',
          contact: {
            phone: '+5552'
          }
        }
      },
      {
        everyoneAt: true,
        doc: {
          _id: 'test'
        }
      }
    ];

    const descendants = [
      {
        _id: 'efg',
        contact: {
          phone: '+5553'
        }
      },
      {
        _id: 'hij',
        contact: {
          phone: '+5552' // duplicate phone number should be removed
        }
      },
      {
        _id: 'klm',
        contact: {
          phone: '+5554'
        }
      },
      {
        _id: 'nop'
      },
    ];

    allDocs.returns(mockAllDocs(recipients[0].doc));
    query.returns(mockAllDocs(descendants));

    return service(recipients, 'hello').then(() => {
      chai.expect(post.callCount).to.equal(1);
      chai.expect(post.args[0][0].tasks.length).to.equal(3);
      assertMessage(post.args[0][0].tasks[0], {
        from: '+5551',
        sent_by: 'jack',
        to: '+5553',
        contact: { _id: descendants[0]._id }
      });
      assertMessage(post.args[0][0].tasks[1], {
        from: '+5551',
        sent_by: 'jack',
        to: '+5552',
        contact: { _id: descendants[1]._id }
      });
      assertMessage(post.args[0][0].tasks[2], {
        from: '+5551',
        sent_by: 'jack',
        to: '+5554',
        contact: { _id: descendants[2]._id }
      });
    });
  });

  it('create doc for multiple types of recipients', () => {

    const recipients = [
      {
        doc: {
          _id: 'abc',
          contact: {
            phone: '+5552'
          }
        }
      },
      {
        selected: false,
        disabled: false,
        text: '+5550',
        id: '+5550',
        _resultId: 'select2-phone-os-result-ef7y-+447890119334',
        element: {}
      },
      {
        everyoneAt: true,
        doc: {
          _id: 'test'
        }
      }
    ];

    const descendants = [
      {
        _id: 'efg',
        contact: {
          phone: '+5553'
        }
      },
      {
        _id: 'hij',
        contact: {
          phone: '+5552' // duplicate phone number should be removed
        }
      },
      {
        _id: 'klm',
        contact: {
          phone: '+5554'
        }
      },
      {
        _id: 'nop'
      },
    ];

    allDocs.returns(mockAllDocs(recipients));
    query.returns(mockAllDocs(descendants));

    return service(recipients, 'hello').then(() => {
      chai.expect(post.callCount).to.equal(1);
      chai.expect(post.args[0][0].tasks.length).to.equal(4);
      assertMessage(post.args[0][0].tasks[0], {
        from: '+5551',
        sent_by: 'jack',
        to: '+5553',
        contact: { _id: descendants[0]._id }
      });
      assertMessage(post.args[0][0].tasks[1], {
        from: '+5551',
        sent_by: 'jack',
        to: '+5552',
        contact: { _id: descendants[1]._id }
      });
      assertMessage(post.args[0][0].tasks[2], {
        from: '+5551',
        sent_by: 'jack',
        to: '+5554',
        contact: { _id: descendants[2]._id }
      });
      assertMessage(post.args[0][0].tasks[3], {
        from: '+5551',
        sent_by: 'jack',
        to: '+5550'
      });
    });
  });


  it('returns post errors', done => {

    post.rejects('errcode2');

    const recipient = {
      _id: 'abc',
      contact: {
        phone: '+5552'
      }
    };

    allDocs.returns(mockAllDocs(recipient));

    service(select2Wrap(recipient), 'hello')
      .then(() => done('expected error to be thrown'))
      .catch(err => {
        chai.expect(err.name).to.equal('errcode2');
        done();
      });
  });

});
