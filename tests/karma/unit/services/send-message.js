describe('SendMessage service', function() {

  'use strict';

  var service,
      Settings,
      allDocs,
      id,
      post,
      query;

  beforeEach(function () {
    allDocs = sinon.stub();
    id = sinon.stub();
    post = sinon.stub();
    query = sinon.stub();
    Settings = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({
        allDocs: allDocs,
        post: post,
        id: id,
        query: query
      }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('UserSettings', function() {
        return KarmaUtils.mockPromise(null, { phone: '+5551', name: 'jack' });
      });
      $provide.value('Settings', Settings);
    });
    inject(function(_SendMessage_) {
      service = _SendMessage_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(allDocs, id, post, query);
  });

  function assertMessage(task, expected) {
    chai.expect(task.state).to.equal('pending');
    chai.expect(task.messages.length).to.equal(1);
    var msg = task.messages[0];
    chai.expect(msg.from).to.equal(expected.from);
    chai.expect(msg.sent_by).to.equal(expected.sent_by);
    chai.expect(msg.to).to.equal(expected.to);
    chai.expect(msg.uuid).to.equal(expected.uuid);
    chai.expect(msg.contact).to.deep.equal(expected.contact);
  }

  function mockAllDocs(docs) {
    if (!Array.isArray(docs)) {
      docs = [docs];
    }
    return KarmaUtils.mockPromise(null, {
      rows: docs.map(function(doc) {return {doc: doc};})
    });
  }

  function select2Wrap(docs) {
    if (!Array.isArray(docs)) {
      docs = [docs];
    }
    return docs.map(function(d) {
      return {doc: d};
    });
  }

  it('create doc for one recipient', function(done) {

    id.returns(KarmaUtils.mockPromise(null, 53));
    post.returns(KarmaUtils.mockPromise());
    Settings.returns(KarmaUtils.mockPromise(null, {}));

    var recipient = {
      _id: 'abc',
      contact: {
        phone: '+5552'
      }
    };

    allDocs.returns(mockAllDocs(recipient));

    service(select2Wrap(recipient), 'hello')
      .then(function() {
        chai.expect(allDocs.callCount).to.equal(1);
        chai.expect(id.callCount).to.equal(1);
        chai.expect(post.callCount).to.equal(1);
        assertMessage(post.args[0][0].tasks[0], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5552',
          uuid: 53,
          contact: recipient
        });
        done();
      })
      .catch(done);
  });

  // TODO: when would we have a `doc` that wasn't an actual contact?
  //       I don't understand this use case, and I don't think it
  //       exists anymore. Propose that I delete it.
  it.skip('create doc for non-contact recipient', function(done) {

    id.returns(KarmaUtils.mockPromise(null, 53));
    post.returns(KarmaUtils.mockPromise());
    Settings.returns(KarmaUtils.mockPromise(null, {}));

    var recipient = {
      doc: {
        contact: {
          phone: '+5552'
        }
      }
    };

    service(recipient, 'hello')
      .then(function() {
        chai.expect(id.callCount).to.equal(1);
        chai.expect(post.callCount).to.equal(1);
        assertMessage(post.args[0][0].tasks[0], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5552',
          uuid: 53,
        });
        done();
      })
      .catch(done);
  });

  it('create doc for non-contact recipient from select2', function(done) {

    id.returns(KarmaUtils.mockPromise(null, 53));
    post.returns(KarmaUtils.mockPromise());
    Settings.returns(KarmaUtils.mockPromise(null, {}));

    var recipient = {
      selected: false,
      disabled: false,
      text: '+5552',
      id: '+5552',
      _resultId: 'select2-phone-os-result-ef7y-+447890119334',
      element: {}
    };

    allDocs.returns(mockAllDocs(recipient));

    service(recipient, 'hello')
      .then(function() {
        chai.expect(id.callCount).to.equal(1);
        chai.expect(post.callCount).to.equal(1);
        assertMessage(post.args[0][0].tasks[0], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5552',
          uuid: 53,
        });
        done();
      })
      .catch(done);
  });

  it('normalizes phone numbers', function(done) {
    // Note : only valid phone numbers can be normalized.

    id.returns(KarmaUtils.mockPromise(null, 53));
    post.returns(KarmaUtils.mockPromise());

    var phoneNumber = '700123456';
    var recipient = {
      _id: 'def',
      contact: {
        phone: phoneNumber
      }
    };
    allDocs.returns(mockAllDocs(recipient));
    Settings.returns(KarmaUtils.mockPromise(null, {
      default_country_code: 254
    }));

    service(select2Wrap(recipient), 'hello')
      .then(function() {
        chai.expect(id.callCount).to.equal(1);
        chai.expect(post.callCount).to.equal(1);
        assertMessage(post.args[0][0].tasks[0], {
          from: '+5551',
          sent_by: 'jack',
          to: '+254' + phoneNumber,
          uuid: 53,
          contact: recipient
        });
        done();
      }).catch(done);
  });

  it('create doc for multiple recipients', function(done) {

    id
      .onFirstCall().returns(KarmaUtils.mockPromise(null, 53))
      .onSecondCall().returns(KarmaUtils.mockPromise(null, 150));
    post.returns(KarmaUtils.mockPromise());
    Settings.returns(KarmaUtils.mockPromise(null, {}));

    var recipients = [
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

    service(select2Wrap(recipients), 'hello')
      .then(function() {
        chai.expect(id.callCount).to.equal(2);
        chai.expect(post.callCount).to.equal(1);
        chai.expect(post.args[0][0].tasks.length).to.equal(2);
        assertMessage(post.args[0][0].tasks[0], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5552',
          uuid: 53,
          contact: recipients[0]
        });
        assertMessage(post.args[0][0].tasks[1], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5553',
          uuid: 150,
          contact: recipients[1]
        });
        done();
      }).catch(done);
  });

  it('create doc for everyoneAt recipients', function(done) {

    id
      .onFirstCall().returns(KarmaUtils.mockPromise(null, 53))
      .onSecondCall().returns(KarmaUtils.mockPromise(null, 150))
      .onThirdCall().returns(KarmaUtils.mockPromise(null, 6));
    post.returns(KarmaUtils.mockPromise());
    Settings.returns(KarmaUtils.mockPromise(null, {}));

    var recipients = [
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

    var descendants = [
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
      }
    ];

    allDocs.returns(mockAllDocs(recipients[0].doc));
    query.returns(mockAllDocs(descendants));

    service(recipients, 'hello')
      .then(function() {
        chai.expect(id.callCount).to.equal(3);
        chai.expect(post.callCount).to.equal(1);
        chai.expect(post.args[0][0].tasks.length).to.equal(3);
        assertMessage(post.args[0][0].tasks[0], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5553',
          uuid: 53,
          contact: descendants[0]
        });
        assertMessage(post.args[0][0].tasks[1], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5552',
          uuid: 150,
          contact: descendants[1]
        });
        assertMessage(post.args[0][0].tasks[2], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5554',
          uuid: 6,
          contact: descendants[2]
        });
        done();
      }).catch(done);
  });

  it('returns newUUID errors', function(done) {

    id.returns(KarmaUtils.mockPromise('errcode1'));
    Settings.returns(KarmaUtils.mockPromise(null, {}));

    var recipient = {
      _id: 'abc',
      contact: {
        phone: '+5552'
      }
    };

    allDocs.returns(mockAllDocs(recipient));

    service(select2Wrap(recipient), 'hello').then(
      function() {
        chai.fail('success', 'error');
      },
      function(err) {
        chai.expect(err).to.equal('errcode1');
        done();
      }
    );
  });

  it('returns post errors', function(done) {

    id.returns(KarmaUtils.mockPromise(null, 3333));
    post.returns(KarmaUtils.mockPromise('errcode2'));
    Settings.returns(KarmaUtils.mockPromise(null, {}));

    var recipient = {
      _id: 'abc',
      contact: {
        phone: '+5552'
      }
    };

    allDocs.returns(mockAllDocs(recipient));

    service(select2Wrap(recipient), 'hello').then(
      function() {
        chai.fail('success', 'error');
      },
      function(err) {
        chai.expect(err).to.equal('errcode2');
        done();
      }
    );
  });

});
