describe('SendMessage service', function() {

  'use strict';

  var service,
      settings,
      id,
      post;

  beforeEach(function () {
    id = sinon.stub();
    post = sinon.stub();
    settings = {};
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', KarmaUtils.mockDB({ post: post, id: id }));
      $provide.value('$q', Q); // bypass $q so we don't have to digest
      $provide.value('UserSettings', function(callback) {
        callback(null, { phone: '+5551', name: 'jack' });
      });
      $provide.value('Settings', function(callback) {
        callback(null, settings);
      });
    });
    inject(function(_SendMessage_) {
      service = _SendMessage_;
    });
  });

  afterEach(function() {
    KarmaUtils.restore(id, post);
  });

  function assertMessage(task, expected) {
    chai.expect(task.state).to.equal('pending');
    chai.expect(task.messages.length).to.equal(1);
    var msg = task.messages[0];
    chai.expect(msg.from).to.equal(expected.from);
    chai.expect(msg.sent_by).to.equal(expected.sent_by);
    chai.expect(msg.to).to.equal(expected.to);
    chai.expect(msg.uuid).to.equal(expected.uuid);
    chai.expect(msg.contact).to.deep.equal(expected.facility);
  }

  it('create doc for one recipient', function(done) {

    id.returns(KarmaUtils.mockPromise(null, 53));
    post.returns(KarmaUtils.mockPromise());

    var recipient = {
      _id: 'abc',
      contact: {
        phone: '+5552'
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
          facility: recipient
        });
        done();
      })
      .catch(done);
  });

  it('normalizes phone numbers', function(done) {

    id.returns(KarmaUtils.mockPromise(null, 53));
    post.returns(KarmaUtils.mockPromise());

    var recipient = { contact: { phone: '5552' } };

    settings = {
      default_country_code: 254
    };

    service(recipient, 'hello')
      .then(function() {
        chai.expect(id.callCount).to.equal(1);
        chai.expect(post.callCount).to.equal(1);
        assertMessage(post.args[0][0].tasks[0], {
          from: '+5551',
          sent_by: 'jack',
          to: '+2545552',
          uuid: 53
        });
        done();
      });
  });

  it('create doc for multiple recipients', function(done) {

    id
      .onFirstCall().returns(KarmaUtils.mockPromise(null, 53))
      .onSecondCall().returns(KarmaUtils.mockPromise(null, 150));
    post.returns(KarmaUtils.mockPromise());

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

    service(recipients, 'hello')
      .then(function() {
        chai.expect(id.callCount).to.equal(2);
        chai.expect(post.callCount).to.equal(1);
        chai.expect(post.args[0][0].tasks.length).to.equal(2);
        assertMessage(post.args[0][0].tasks[0], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5552',
          uuid: 53,
          facility: recipients[0]
        });
        assertMessage(post.args[0][0].tasks[1], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5553',
          uuid: 150,
          facility: recipients[1]
        });
        done();
      });
  });

  it('create doc for everyoneAt recipients', function(done) {

    id
      .onFirstCall().returns(KarmaUtils.mockPromise(null, 53))
      .onSecondCall().returns(KarmaUtils.mockPromise(null, 150))
      .onThirdCall().returns(KarmaUtils.mockPromise(null, 6));
    post.returns(KarmaUtils.mockPromise());

    var recipients = [
      {
        _id: 'abc',
        contact: {
          phone: '+5552'
        }
      }, 
      {
        everyoneAt: true,
        descendants: [
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
        ]
      }
    ];

    service(recipients, 'hello')
      .then(function() {
        chai.expect(id.callCount).to.equal(3);
        chai.expect(post.callCount).to.equal(1);
        chai.expect(post.args[0][0].tasks.length).to.equal(3);
        assertMessage(post.args[0][0].tasks[0], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5552',
          uuid: 53,
          facility: recipients[0]
        });
        assertMessage(post.args[0][0].tasks[1], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5553',
          uuid: 150,
          facility: recipients[1].descendants[0]
        });
        assertMessage(post.args[0][0].tasks[2], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5554',
          uuid: 6,
          facility: recipients[1].descendants[2]
        });
        done();
      });
  });

  it('returns newUUID errors', function(done) {

    id.returns(KarmaUtils.mockPromise('errcode1'));

    var recipients = {
      _id: 'abc',
      contact: {
        phone: '+5552'
      }
    };

    service(recipients, 'hello').then(
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

    var recipients = {
      _id: 'abc',
      contact: {
        phone: '+5552'
      }
    };

    service(recipients, 'hello').then(
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