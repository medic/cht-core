describe('SendMessage service', function() {

  'use strict';

  var service,
      Settings,
      allDocs,
      post,
      query;

  beforeEach(function () {
    allDocs = sinon.stub();
    post = sinon.stub();
    query = sinon.stub();
    Settings = sinon.stub();
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({
        allDocs: allDocs,
        post: post,
        query: query
      }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('UserSettings', function() {
        return Promise.resolve({ phone: '+5551', name: 'jack' });
      });
      $provide.value('Settings', Settings);
    });
    inject(function(_SendMessage_) {
      service = _SendMessage_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(allDocs, post, query);
  });

  function assertMessage(task, expected) {
    chai.expect(task.state).to.equal('pending');
    chai.expect(task.messages.length).to.equal(1);
    var msg = task.messages[0];
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

    post.returns(Promise.resolve());
    Settings.returns(Promise.resolve({}));

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
        chai.expect(post.callCount).to.equal(1);
        assertMessage(post.args[0][0].tasks[0], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5552',
          contact: { _id: recipient._id }
        });
        done();
      })
      .catch(done);
  });

  it('create doc for non-contact recipient from select2', function(done) {

    post.returns(Promise.resolve());
    Settings.returns(Promise.resolve({}));

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
        chai.expect(post.callCount).to.equal(1);
        assertMessage(post.args[0][0].tasks[0], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5552'
        });
        done();
      })
      .catch(done);
  });

  it('normalizes phone numbers', function(done) {
    // Note : only valid phone numbers can be normalized.

    post.returns(Promise.resolve());

    var phoneNumber = '700123456';
    var recipient = {
      _id: 'def',
      contact: {
        phone: phoneNumber
      }
    };
    allDocs.returns(mockAllDocs(recipient));
    Settings.returns(Promise.resolve({
      default_country_code: 254
    }));

    service(select2Wrap(recipient), 'hello')
      .then(function() {
        chai.expect(post.callCount).to.equal(1);
        assertMessage(post.args[0][0].tasks[0], {
          from: '+5551',
          sent_by: 'jack',
          to: '+254' + phoneNumber,
          contact: { _id: recipient._id }
        });
        done();
      }).catch(done);
  });

  it('create doc for multiple recipients', function(done) {

    post.returns(Promise.resolve());
    Settings.returns(Promise.resolve({}));

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
        done();
      }).catch(done);
  });

  it('create doc for everyoneAt recipients', function(done) {

    post.returns(Promise.resolve());
    Settings.returns(Promise.resolve({}));

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
      },
      {
        _id: 'nop'
      },
    ];

    allDocs.returns(mockAllDocs(recipients[0].doc));
    query.returns(mockAllDocs(descendants));

    service(recipients, 'hello')
      .then(function() {
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
        done();
      }).catch(done);
  });

  it('create doc for multiple types of recipients', function(done) {

    post.returns(Promise.resolve());
    Settings.returns(Promise.resolve({}));

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
      },
      {
        _id: 'nop'
      },
    ];

    allDocs.returns(mockAllDocs(recipients));
    query.returns(mockAllDocs(descendants));

    service(recipients, 'hello')
      .then(function() {
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
        done();
      }).catch(done);
  });


  it('returns post errors', function(done) {

    post.returns(Promise.reject('errcode2'));
    Settings.returns(Promise.resolve({}));

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
