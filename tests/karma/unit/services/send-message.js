describe('SendMessage service', function() {

  'use strict';

  var service,
      $rootScope,
      settings,
      id,
      saveDoc;

  beforeEach(function () {
    id = sinon.stub();
    saveDoc = sinon.stub();
    settings = {};
    module('inboxApp');
    module(function ($provide) {
      $provide.factory('DB', function() {
        return {
          get: function() {
            return {
              post: saveDoc,
              id: id
            };
          }
        };
      });
      $provide.value('User', function(callback) {
        callback(null, { phone: '+5551', name: 'jack' });
      });
      $provide.value('Settings', function(callback) {
        callback(null, settings);
      });
    });
    inject(function(_SendMessage_, _$rootScope_) {
      $rootScope = _$rootScope_;
      service = _SendMessage_;
    });
  });

  afterEach(function() {
    if (id.restore) {
      id.restore();
    }
    if (saveDoc.restore) {
      saveDoc.restore();
    }
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

    id.returns(KarmaUtils.fakeResolved(null, 53));
    saveDoc.returns(KarmaUtils.fakeResolved());

    var recipient = {
      _id: 'abc',
      contact: {
        phone: '+5552'
      }
    };

    service(recipient, 'hello')
      .then(function() {
        chai.expect(id.callCount).to.equal(1);
        chai.expect(saveDoc.callCount).to.equal(1);
        assertMessage(saveDoc.args[0][0].tasks[0], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5552',
          uuid: 53,
          facility: recipient
        });
        done();
      });

    // needed to resolve the promise
    $rootScope.$digest();
  });

  it('normalizes phone numbers', function(done) {

    id.returns(KarmaUtils.fakeResolved(null, 53));
    saveDoc.returns(KarmaUtils.fakeResolved());

    var recipient = { contact: { phone: '5552' } };

    settings = {
      default_country_code: 254
    };

    service(recipient, 'hello')
      .then(function() {
        chai.expect(id.callCount).to.equal(1);
        chai.expect(saveDoc.callCount).to.equal(1);
        assertMessage(saveDoc.args[0][0].tasks[0], {
          from: '+5551',
          sent_by: 'jack',
          to: '+2545552',
          uuid: 53
        });
        done();
      });

    // needed to resolve the promise
    $rootScope.$digest();
  });

  it('create doc for multiple recipients', function(done) {

    id
      .onFirstCall().returns(KarmaUtils.fakeResolved(null, 53))
      .onSecondCall().returns(KarmaUtils.fakeResolved(null, 150));
    saveDoc.returns(KarmaUtils.fakeResolved());

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
        chai.expect(saveDoc.callCount).to.equal(1);
        chai.expect(saveDoc.args[0][0].tasks.length).to.equal(2);
        assertMessage(saveDoc.args[0][0].tasks[0], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5552',
          uuid: 53,
          facility: recipients[0]
        });
        assertMessage(saveDoc.args[0][0].tasks[1], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5553',
          uuid: 150,
          facility: recipients[1]
        });
        done();
      });

    // needed to resolve the promise
    $rootScope.$digest();
  });

  it('create doc for everyoneAt recipients', function(done) {

    id
      .onFirstCall().returns(KarmaUtils.fakeResolved(null, 53))
      .onSecondCall().returns(KarmaUtils.fakeResolved(null, 150))
      .onThirdCall().returns(KarmaUtils.fakeResolved(null, 6));
    saveDoc.returns(KarmaUtils.fakeResolved());

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
        chai.expect(saveDoc.callCount).to.equal(1);
        chai.expect(saveDoc.args[0][0].tasks.length).to.equal(3);
        assertMessage(saveDoc.args[0][0].tasks[0], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5552',
          uuid: 53,
          facility: recipients[0]
        });
        assertMessage(saveDoc.args[0][0].tasks[1], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5553',
          uuid: 150,
          facility: recipients[1].descendants[0]
        });
        assertMessage(saveDoc.args[0][0].tasks[2], {
          from: '+5551',
          sent_by: 'jack',
          to: '+5554',
          uuid: 6,
          facility: recipients[1].descendants[2]
        });
        done();
      });

    // needed to resolve the promise
    $rootScope.$digest();
  });

  it('returns newUUID errors', function(done) {

    id.returns(KarmaUtils.fakeResolved('errcode1'));

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

    // needed to resolve the promise
    $rootScope.$digest();
  });

  it('returns saveDoc errors', function(done) {

    id.returns(KarmaUtils.fakeResolved(null, 3333));
    saveDoc.returns(KarmaUtils.fakeResolved('errcode2'));

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

    // needed to resolve the promise
    $rootScope.$digest();
  });

});